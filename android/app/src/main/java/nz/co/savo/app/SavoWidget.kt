package nz.co.savo.app

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.ImageProvider
import androidx.glance.Image
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback

import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

private const val WIDGET_PREFS = "savo_widget_prefs"
private const val REFRESH_COOLDOWN_MS = 60_000L
private const val MAX_WIDGET_VEHICLES = 10

class SavoWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)

            val vehicleCount = prefs.getInt("vehicles_count", 0)
            val currentIndex = if (vehicleCount > 0) {
                prefs.getInt("vehicles_current_index", 0).coerceAtLeast(0) % vehicleCount
            } else 0
            val isRefreshing = prefs.getBoolean("widget_refreshing", false)

            val rego = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_rego", "") ?: ""
            else ""
            val nickname = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_nickname", "") ?: ""
            else ""
            val regoExpiry = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_rego_expiry", "") ?: ""
            else ""
            val wofExpiry = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_wof_expiry", "") ?: ""
            else ""
            val insuranceExpiry = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_insurance_expiry", "") ?: ""
            else ""
            val roadsidePhone = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_roadside_phone", "") ?: ""
            else ""
            val roadsideName = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_roadside_name", "") ?: "Roadside"
            else "Roadside"

            WidgetBody(
                rego = rego,
                nickname = nickname,
                regoExpiry = regoExpiry,
                wofExpiry = wofExpiry,
                insuranceExpiry = insuranceExpiry,
                roadsideName = roadsideName,
                roadsidePhone = roadsidePhone,
                showSwitch = vehicleCount > 1,
                currentIndexLabel = (currentIndex + 1).toString(),
                vehicleCountLabel = vehicleCount.toString(),
                isRefreshing = isRefreshing,
            )
        }
    }
}

// Status of an expiry date — drives colour coding (green / amber / red).
private enum class ExpiryStatus { Unknown, Ok, Soon, Critical }

private fun daysUntilExpiry(isoDate: String): Long? {
    if (isoDate.isBlank()) return null
    return try {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        val target = fmt.parse(isoDate) ?: return null
        val today = fmt.parse(fmt.format(java.util.Date())) ?: return null
        TimeUnit.MILLISECONDS.toDays(target.time - today.time)
    } catch (_: Exception) { null }
}

private fun expiryStatus(isoDate: String): ExpiryStatus {
    val diff = daysUntilExpiry(isoDate) ?: return ExpiryStatus.Unknown
    return when {
        diff <= 7 -> ExpiryStatus.Critical
        diff <= 30 -> ExpiryStatus.Soon
        else -> ExpiryStatus.Ok
    }
}

@Composable
private fun WidgetBody(
    rego: String,
    nickname: String,
    regoExpiry: String,
    wofExpiry: String,
    insuranceExpiry: String,
    roadsideName: String,
    roadsidePhone: String,
    showSwitch: Boolean,
    currentIndexLabel: String,
    vehicleCountLabel: String,
    isRefreshing: Boolean,
) {
    val bg = ColorProvider(Color(0xFFFFFFFF))
    val brand = ColorProvider(Color(0xFF1E3A5F))
    val accent = ColorProvider(Color(0xFF2563EB))
    val text = ColorProvider(Color(0xFF0F172A))
    val muted = ColorProvider(Color(0xFF64748B))
    val plateBg = ColorProvider(Color(0xFFFBBF24))
    val plateFg = ColorProvider(Color(0xFF111827))
    val pillBg = ColorProvider(Color(0xFFF1F5F9))
    val pillFg = ColorProvider(Color(0xFF1E3A5F))
    val white = ColorProvider(Color(0xFFFFFFFF))
    val redSoft = ColorProvider(Color(0xFFFEE2E2))

    // Alert mode: critical/expired items -> red-tinted card.
    val statuses = listOf(expiryStatus(regoExpiry), expiryStatus(wofExpiry), expiryStatus(insuranceExpiry))
    val anyCritical = statuses.any { it == ExpiryStatus.Critical }
    val cardBg = if (anyCritical) redSoft else bg

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(cardBg)
            .cornerRadius(28.dp)
            .padding(14.dp)
    ) {
        // Row 1: SAVO logo + nickname + plate badge (always visible if present).
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Image(
                provider = ImageProvider(R.mipmap.ic_launcher),
                contentDescription = "SAVO",
                modifier = GlanceModifier.size(22.dp),
            )
            Spacer(GlanceModifier.width(8.dp))
            Column(
                modifier = GlanceModifier.defaultWeight().clickable(
                    if (showSwitch) actionRunCallback<NextVehicleAction>() else actionRunCallback<RefreshWidgetAction>()
                )
            ) {
                Text(
                    text = if (nickname.isNotEmpty()) nickname else "SAVO",
                    style = TextStyle(color = brand, fontSize = 16.sp, fontWeight = FontWeight.Bold),
                    maxLines = 1,
                )
                if (nickname.isNotEmpty()) {
                    Text(
                        text = "SAVO",
                        style = TextStyle(color = muted, fontSize = 10.sp, fontWeight = FontWeight.Medium),
                        maxLines = 1,
                    )
                }
            }
            // Manual refresh — immediately re-fetches from backend.
            Box(
                contentAlignment = Alignment.Center,
                modifier = GlanceModifier
                    .size(42.dp)
                    .background(pillBg)
                    .cornerRadius(21.dp)
                    .clickable(actionRunCallback<RefreshWidgetAction>())
            ) {
                Text(if (isRefreshing) "…" else "⟳", style = TextStyle(color = pillFg, fontSize = 18.sp, fontWeight = FontWeight.Bold))
            }
            if (rego.isNotEmpty()) {
                Spacer(GlanceModifier.width(8.dp))
                // Tap the rego plate itself to switch vehicles. The clickable
                // modifier MUST be on the outermost Box for Glance to register
                // taps reliably; nesting it inside a Column eats the touch on
                // some launchers (Pixel/OneUI).
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .clickable(if (showSwitch) actionRunCallback<NextVehicleAction>() else actionRunCallback<RefreshWidgetAction>())
                        .background(plateBg)
                        .cornerRadius(8.dp)
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(rego, style = TextStyle(color = plateFg, fontSize = 18.sp, fontWeight = FontWeight.Bold))
                        if (showSwitch) {
                            Text(
                                "tap ${currentIndexLabel}/${vehicleCountLabel}",
                                style = TextStyle(color = plateFg, fontSize = 8.sp, fontWeight = FontWeight.Medium),
                                maxLines = 1,
                            )
                        }
                    }
                }
            } else if (vehicleCountLabel != "0") {
                // Vehicle exists but rego is missing — prompt a reload.
                Spacer(GlanceModifier.width(8.dp))
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .background(pillBg)
                        .cornerRadius(8.dp)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                        .clickable(actionRunCallback<RefreshWidgetAction>())
                ) { Text("Tap ⟳ to reload", style = TextStyle(color = pillFg, fontSize = 11.sp, fontWeight = FontWeight.Bold)) }
            }
        }

        // (Switcher arrows row removed — tap the rego plate to cycle vehicles.)

        Spacer(GlanceModifier.height(8.dp))

        if (vehicleCountLabel == "0") {
            // Empty state — no vehicles cached. Tap to retry the backend fetch.
            Box(
                contentAlignment = Alignment.Center,
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(pillBg)
                    .cornerRadius(20.dp)
                    .padding(horizontal = 12.dp, vertical = 18.dp)
                    .clickable(actionRunCallback<RefreshWidgetAction>())
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "No vehicles yet",
                        style = TextStyle(color = pillFg, fontSize = 14.sp, fontWeight = FontWeight.Bold),
                    )
                    Spacer(GlanceModifier.height(2.dp))
                    Text(
                        "Tap to reload vehicles",
                        style = TextStyle(color = muted, fontSize = 11.sp, fontWeight = FontWeight.Medium),
                    )
                }
            }
        } else {
            // Expiry pill — circular ring indicators + days-left.
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(pillBg)
                    .cornerRadius(20.dp)
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                StatusCell("Rego", regoExpiry, muted, text, GlanceModifier.defaultWeight())
                StatusCell("WOF", wofExpiry, muted, text, GlanceModifier.defaultWeight())
                StatusCell("Insurance", insuranceExpiry, muted, text, GlanceModifier.defaultWeight())
            }
        }

        Spacer(GlanceModifier.height(8.dp))

        // Quick Accident Capture — primary action
        Box(
            contentAlignment = Alignment.Center,
            modifier = GlanceModifier
                .fillMaxWidth()
                .height(48.dp)
                .background(accent)
                .cornerRadius(24.dp)
                .clickable(actionStartActivity(deepLinkIntent("savo://quick-capture")))
        ) {
            Text(
                "Quick Accident Capture",
                style = TextStyle(color = white, fontSize = 16.sp, fontWeight = FontWeight.Bold),
            )
        }
        Spacer(GlanceModifier.height(7.dp))

            // Google-style action icons: Roadside, Tow trucks, 111 (no captions).
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            IconOnlyButton(
                icon = WidgetActionIcon.Roadside,
                contentDescription = if (roadsidePhone.isNotEmpty()) roadsideName else "Roadside",
                onClickAction = actionStartActivity(callIntent(roadsidePhone)),
            )
            Spacer(GlanceModifier.defaultWeight())
            IconOnlyButton(
                icon = WidgetActionIcon.TowTruck,
                contentDescription = "Tow trucks",
                onClickAction = actionStartActivity(deepLinkIntent("savo://tow-companies")),
            )
            Spacer(GlanceModifier.defaultWeight())
            IconOnlyButton(
                icon = WidgetActionIcon.Emergency,
                contentDescription = "Emergency 111",
                onClickAction = actionStartActivity(callIntent("111")),
            )
        }
    }
}

private enum class WidgetActionIcon { Roadside, TowTruck, Emergency }

@Composable
private fun IconOnlyButton(
    icon: WidgetActionIcon,
    contentDescription: String,
    onClickAction: androidx.glance.action.Action,
) {
    Image(
        provider = ImageProvider(actionIconBitmap(icon)),
        contentDescription = contentDescription,
        modifier = GlanceModifier
            .size(64.dp)
            .clickable(onClickAction),
    )
}

private fun actionIconBitmap(icon: WidgetActionIcon): Bitmap {
    val size = 192
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val black = 0xFF111111.toInt()
    val strokeW = 7f
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = black
        style = Paint.Style.STROKE
        strokeWidth = strokeW
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    val ringStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = black
        style = Paint.Style.STROKE
        strokeWidth = 5f
    }
    val whiteFill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt(); style = Paint.Style.FILL }
    val redStroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFDC2626.toInt()
        style = Paint.Style.STROKE
        strokeWidth = 6f
    }
    val redFill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFDC2626.toInt(); style = Paint.Style.FILL }
    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        style = Paint.Style.FILL
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
    }

    // White background circle + thin black ring (Apple/Material outlined style).
    val pad = 8f
    canvas.drawOval(RectF(pad, pad, size - pad, size - pad), whiteFill)

    when (icon) {
        WidgetActionIcon.Roadside -> {
            // Outlined ring + simple car silhouette inside.
            canvas.drawOval(RectF(pad, pad, size - pad, size - pad), ringStroke)
            // Car body: lower box with rounded roof
            val cx = size / 2f
            val cy = size / 2f + 6f
            // Roof (trapezoid approx via rounded rect)
            canvas.drawRoundRect(RectF(cx - 38f, cy - 26f, cx + 38f, cy - 4f), 12f, 12f, stroke)
            // Body
            canvas.drawRoundRect(RectF(cx - 56f, cy - 6f, cx + 56f, cy + 22f), 10f, 10f, stroke)
            // Wheels (outline)
            canvas.drawCircle(cx - 32f, cy + 26f, 11f, stroke)
            canvas.drawCircle(cx + 32f, cy + 26f, 11f, stroke)
        }
        WidgetActionIcon.TowTruck -> {
            canvas.drawOval(RectF(pad, pad, size - pad, size - pad), ringStroke)
            val cy = size / 2f + 8f
            // Cab
            canvas.drawRoundRect(RectF(38f, cy - 14f, 84f, cy + 18f), 6f, 6f, stroke)
            // Flatbed
            canvas.drawRoundRect(RectF(84f, cy + 2f, 154f, cy + 18f), 4f, 4f, stroke)
            // Crane arm
            canvas.drawLine(44f, cy - 14f, 64f, cy - 44f, stroke)
            canvas.drawLine(64f, cy - 44f, 130f, cy - 44f, stroke)
            canvas.drawLine(130f, cy - 44f, 130f, cy - 20f, stroke)
            // Hook
            canvas.drawCircle(130f, cy - 14f, 5f, stroke)
            // Wheels
            canvas.drawCircle(56f, cy + 26f, 11f, stroke)
            canvas.drawCircle(132f, cy + 26f, 11f, stroke)
        }
        WidgetActionIcon.Emergency -> {
            // Solid red circle with "111" — emergency.
            canvas.drawOval(RectF(pad, pad, size - pad, size - pad), redFill)
            canvas.drawOval(RectF(pad, pad, size - pad, size - pad), redStroke)
            textPaint.textSize = 64f
            val ty = (size / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2f)
            canvas.drawText("111", size / 2f, ty, textPaint)
        }
    }
    return bitmap
}

@Composable
private fun StatusCell(
    label: String,
    isoDate: String,
    muted: ColorProvider,
    text: ColorProvider,
    modifier: GlanceModifier,
) {
    val status = expiryStatus(isoDate)
    val days = daysUntilExpiry(isoDate)
    val ringColor = when (status) {
        ExpiryStatus.Ok -> 0xFF16A34A.toInt()
        ExpiryStatus.Soon -> 0xFFD97706.toInt()
        ExpiryStatus.Critical -> 0xFFDC2626.toInt()
        ExpiryStatus.Unknown -> 0xFFCBD5E1.toInt()
    }
    val dayNumber = days?.coerceAtLeast(0)?.toString() ?: "—"

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            provider = ImageProvider(expiryRingBitmap(dayNumber, ringColor, progressForDays(days))),
            contentDescription = "$label expiry",
            modifier = GlanceModifier.size(42.dp),
        )
        Spacer(GlanceModifier.height(2.dp))
        Text(label, style = TextStyle(color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold), maxLines = 1)
        Text(
            if (days == null) "missing" else if (days < 0) "expired" else "days",
            style = TextStyle(color = text, fontSize = 10.sp, fontWeight = FontWeight.Medium),
            maxLines = 1,
        )
    }
}

private fun progressForDays(days: Long?): Float {
    if (days == null) return 0f
    return (days.coerceIn(0, 30).toFloat() / 30f).coerceIn(0.08f, 1f)
}

private fun expiryRingBitmap(value: String, color: Int, progress: Float): Bitmap {
    val size = 96
    val stroke = 10f
    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val bounds = RectF(stroke, stroke, size - stroke, size - stroke)
    val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
        this.color = 0xFFE2E8F0.toInt()
    }
    val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
        this.color = color
    }
    val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        this.color = 0xFF0F172A.toInt()
        textAlign = Paint.Align.CENTER
        textSize = if (value.length > 2) 26f else 34f
        isFakeBoldText = true
    }
    canvas.drawArc(bounds, 0f, 360f, false, track)
    canvas.drawArc(bounds, -90f, 360f * progress, false, arc)
    val y = (size / 2f) - ((textPaint.descent() + textPaint.ascent()) / 2f)
    canvas.drawText(value, size / 2f, y, textPaint)
    return bitmap
}

@Composable
private fun ActionButton(
    label: String,
    colorBg: ColorProvider,
    colorFg: ColorProvider,
    modifier: GlanceModifier,
) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = modifier
            .height(48.dp)
            .background(colorBg)
            .cornerRadius(24.dp)
    ) {
        Text(label, style = TextStyle(color = colorFg, fontSize = 15.sp, fontWeight = FontWeight.Bold))
    }
}

private fun deepLinkIntent(uri: String): Intent =
    Intent(Intent.ACTION_VIEW, Uri.parse(uri)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)

private fun callIntent(phone: String): Intent {
    if (phone.isBlank()) return Intent(Intent.ACTION_VIEW, Uri.parse("savo://dashboard"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    return Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
}

class NextVehicleAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        cycleVehicle(context, glanceId, +1)
    }
}

class PrevVehicleAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        cycleVehicle(context, glanceId, -1)
    }
}

class NextVehicleReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt("vehicles_count", 0)
        if (count > 1) {
            val current = prefs.getInt("vehicles_current_index", 0)
            val next = (current + 1) % count
            prefs.edit()
                .putInt("vehicles_current_index", next)
                .putLong("widget_last_switch_ms", System.currentTimeMillis())
                .commit()
            GlobalScope.launch(Dispatchers.Main) {
                try {
                    SavoWidget().updateAll(context.applicationContext)
                } finally {
                    pendingResult.finish()
                }
            }
            scheduleAutoAdvance(context)
        } else {
            pendingResult.finish()
        }
    }
}

private suspend fun cycleVehicle(context: Context, glanceId: GlanceId, delta: Int) {
    val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
    val count = prefs.getInt("vehicles_count", 0)
    if (count > 1) {
        val current = prefs.getInt("vehicles_current_index", 0)
        val next = ((current + delta) % count + count) % count
        prefs.edit()
            .putInt("vehicles_current_index", next)
            .putLong("widget_last_switch_ms", System.currentTimeMillis())
            .commit()
    }
    // Force both the tapped instance and any launcher-cached instances to redraw immediately.
    SavoWidget().update(context, glanceId)
    SavoWidget().updateAll(context)
    // Reset the auto-advance ticker so the user gets a fresh window after
    // manually navigating.
    scheduleAutoAdvance(context)
}

class RefreshWidgetAction : ActionCallback {
    override suspend fun onAction(context: Context, glanceId: GlanceId, parameters: ActionParameters) {
        val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        val last = prefs.getLong("last_manual_refresh_ms", 0L)
        // 60-second cooldown — silently ignore repeated taps to avoid spamming
        // the widget-data edge function.
        if (now - last < REFRESH_COOLDOWN_MS) return
        prefs.edit()
            .putLong("last_manual_refresh_ms", now)
            .putBoolean("widget_refreshing", true)
            .commit()
        SavoWidget().update(context, glanceId)
        refreshFromBackend(context)
    }
}

class SavoWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SavoWidget()

    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        refreshFromBackend(context)
        scheduleAutoAdvance(context)
    }

    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        scheduleAutoAdvance(context)
    }

    override fun onDisabled(context: Context) {
        cancelAutoAdvance(context)
        super.onDisabled(context)
    }
}

// Auto-advance: cycle to the next vehicle every 6s when 2+ vehicles are
// present. Uses AlarmManager + a broadcast receiver to avoid keeping a
// long-lived coroutine alive (Glance widgets are short-lived processes).
private const val AUTO_ADVANCE_INTERVAL_MS = 6_000L
private const val AUTO_ADVANCE_ACTION = "nz.co.savo.app.WIDGET_AUTO_ADVANCE"

internal fun scheduleAutoAdvance(context: Context) {
    val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
    if (prefs.getInt("vehicles_count", 0) < 2) {
        cancelAutoAdvance(context)
        return
    }
    val am = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
    val pi = autoAdvancePendingIntent(context)
    am.cancel(pi)
    am.set(
        android.app.AlarmManager.ELAPSED_REALTIME,
        android.os.SystemClock.elapsedRealtime() + AUTO_ADVANCE_INTERVAL_MS,
        pi,
    )
}

internal fun cancelAutoAdvance(context: Context) {
    val am = context.getSystemService(Context.ALARM_SERVICE) as android.app.AlarmManager
    am.cancel(autoAdvancePendingIntent(context))
}

private fun autoAdvancePendingIntent(context: Context): android.app.PendingIntent {
    val intent = Intent(context, AutoAdvanceReceiver::class.java).apply {
        action = AUTO_ADVANCE_ACTION
    }
    return android.app.PendingIntent.getBroadcast(
        context, 0, intent,
        android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE,
    )
}

class AutoAdvanceReceiver : android.content.BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != AUTO_ADVANCE_ACTION) return
        val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt("vehicles_count", 0)
        if (count > 1) {
            val current = prefs.getInt("vehicles_current_index", 0)
            val next = (current + 1) % count
            prefs.edit().putInt("vehicles_current_index", next).commit()
            GlobalScope.launch(Dispatchers.Main) {
                SavoWidget().updateAll(context)
            }
        }
        // Reschedule the next tick.
        scheduleAutoAdvance(context)
    }
}

internal fun refreshFromBackend(context: Context) {
    val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
    val token = prefs.getString("widget_token", null)
    val baseUrl = prefs.getString("supabase_url", null)
    if (token.isNullOrBlank() || baseUrl.isNullOrBlank()) {
        prefs.edit().putBoolean("widget_refreshing", false).apply()
        return
    }
    val anon = prefs.getString("supabase_anon", null) ?: ""

    GlobalScope.launch(Dispatchers.IO) {
        try {
            val cleanBaseUrl = baseUrl.trimEnd('/')
            val url = URL("$cleanBaseUrl/functions/v1/widget-data")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.setRequestProperty("X-Widget-Token", token)
            if (anon.isNotEmpty()) conn.setRequestProperty("apikey", anon)
            conn.connectTimeout = 8000
            conn.readTimeout = 8000

            if (conn.responseCode != 200) return@launch
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            val json = JSONObject(body)

            val editor = prefs.edit()

            // Clear previous vehicle list
            val prevCount = prefs.getInt("vehicles_count", 0)
            for (i in 0 until maxOf(prevCount, MAX_WIDGET_VEHICLES)) {
                editor.remove("vehicle_${i}_rego")
                editor.remove("vehicle_${i}_nickname")
                editor.remove("vehicle_${i}_rego_expiry")
                editor.remove("vehicle_${i}_wof_expiry")
                editor.remove("vehicle_${i}_insurance_expiry")
                editor.remove("vehicle_${i}_roadside_name")
                editor.remove("vehicle_${i}_roadside_phone")
            }

            val vehiclesArr: JSONArray? = json.optJSONArray("vehicles")
            val total = minOf(MAX_WIDGET_VEHICLES, vehiclesArr?.length() ?: 0)
            editor.putInt("vehicles_count", total)
            if (vehiclesArr != null) {
                for (i in 0 until total) {
                    val v = vehiclesArr.optJSONObject(i) ?: continue
                    val nick = v.optString("nickname", "").ifEmpty {
                        listOf(v.optString("make", ""), v.optString("model", ""))
                            .filter { it.isNotEmpty() }.joinToString(" ")
                    }
                    editor.putString("vehicle_${i}_rego", v.optString("rego", ""))
                    editor.putString("vehicle_${i}_nickname", nick)
                    editor.putString("vehicle_${i}_rego_expiry", v.optString("regoExpiry", ""))
                    editor.putString("vehicle_${i}_wof_expiry", v.optString("wofExpiry", ""))
                    editor.putString("vehicle_${i}_insurance_expiry", v.optString("insuranceExpiry", ""))
                    editor.putString("vehicle_${i}_roadside_name", v.optString("roadsideName", "Roadside"))
                    editor.putString("vehicle_${i}_roadside_phone", v.optString("roadsidePhone", ""))
                }
            }
            val curIdx = prefs.getInt("vehicles_current_index", 0)
            if (total == 0 || curIdx >= total) editor.putInt("vehicles_current_index", 0)
            editor.putBoolean("widget_refreshing", false)
            editor.putLong("widget_last_success_ms", System.currentTimeMillis())

            editor.commit()

            withContext(Dispatchers.Main) {
                SavoWidget().updateAll(context)
            }
        } catch (_: Exception) {
            // keep showing cached data
        } finally {
            prefs.edit().putBoolean("widget_refreshing", false).apply()
            withContext(Dispatchers.Main) {
                SavoWidget().updateAll(context)
            }
        }
    }
}
