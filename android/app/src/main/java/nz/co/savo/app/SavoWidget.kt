package nz.co.savo.app

import android.content.Context
import android.content.Intent
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

class SavoWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)

            val vehicleCount = prefs.getInt("vehicles_count", 0)
            val currentIndex = if (vehicleCount > 0) {
                prefs.getInt("vehicles_current_index", 0).coerceAtLeast(0) % vehicleCount
            } else 0

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
            )
        }
    }
}

// Status of an expiry date — drives colour coding (green / amber / red).
private enum class ExpiryStatus { Unknown, Ok, Soon, Expired }

private fun expiryStatus(isoDate: String): ExpiryStatus {
    if (isoDate.isBlank()) return ExpiryStatus.Unknown
    return try {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        val target = fmt.parse(isoDate) ?: return ExpiryStatus.Unknown
        val today = fmt.parse(fmt.format(java.util.Date())) ?: return ExpiryStatus.Unknown
        val diff = TimeUnit.MILLISECONDS.toDays(target.time - today.time)
        when {
            diff < 0 -> ExpiryStatus.Expired
            diff <= 30 -> ExpiryStatus.Soon
            else -> ExpiryStatus.Ok
        }
    } catch (_: Exception) { ExpiryStatus.Unknown }
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
    val red = ColorProvider(Color(0xFFB91C1C))
    val redSoft = ColorProvider(Color(0xFFFEE2E2))

    // Alert mode: any expired item -> red-tinted card.
    val statuses = listOf(expiryStatus(regoExpiry), expiryStatus(wofExpiry), expiryStatus(insuranceExpiry))
    val anyExpired = statuses.any { it == ExpiryStatus.Expired }
    val cardBg = if (anyExpired) redSoft else bg

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
            Column(modifier = GlanceModifier.defaultWeight().clickable(actionRunCallback<RefreshWidgetAction>())) {
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
                    .size(32.dp)
                    .background(pillBg)
                    .cornerRadius(16.dp)
                    .clickable(actionRunCallback<RefreshWidgetAction>())
            ) {
                Text("⟳", style = TextStyle(color = pillFg, fontSize = 18.sp, fontWeight = FontWeight.Bold))
            }
            if (rego.isNotEmpty()) {
                Spacer(GlanceModifier.width(8.dp))
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .background(plateBg)
                        .cornerRadius(8.dp)
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) { Text(rego, style = TextStyle(color = plateFg, fontSize = 16.sp, fontWeight = FontWeight.Bold)) }
            }
        }

        // Vehicle switcher bar — only when there are 2+ vehicles. Big tappable
        // arrows + an explicit "1 / N" indicator so users know to tap (no swipe).
        if (showSwitch) {
            Spacer(GlanceModifier.height(10.dp))
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(pillBg)
                    .cornerRadius(22.dp)
                    .padding(horizontal = 6.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .size(36.dp)
                        .cornerRadius(18.dp)
                        .clickable(actionRunCallback<PrevVehicleAction>())
                ) { Text("◀", style = TextStyle(color = pillFg, fontSize = 14.sp, fontWeight = FontWeight.Bold)) }
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier.defaultWeight().height(36.dp),
                ) {
                    Text(
                        "Vehicle ${currentIndexLabel} / ${vehicleCountLabel}",
                        style = TextStyle(color = pillFg, fontSize = 12.sp, fontWeight = FontWeight.Bold),
                    )
                }
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .size(36.dp)
                        .cornerRadius(18.dp)
                        .clickable(actionRunCallback<NextVehicleAction>())
                ) { Text("▶", style = TextStyle(color = pillFg, fontSize = 14.sp, fontWeight = FontWeight.Bold)) }
            }
        }

        Spacer(GlanceModifier.height(12.dp))

        // Expiry pill — colored status dots + days-left.
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .background(pillBg)
                .cornerRadius(20.dp)
                .padding(horizontal = 10.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            StatusCell("Rego", regoExpiry, muted, text, GlanceModifier.defaultWeight())
            StatusCell("WOF", wofExpiry, muted, text, GlanceModifier.defaultWeight())
            StatusCell("Insurance", insuranceExpiry, muted, text, GlanceModifier.defaultWeight())
        }

        Spacer(GlanceModifier.height(10.dp))

        // Quick Accident Capture — primary action
        Box(
            contentAlignment = Alignment.Center,
            modifier = GlanceModifier
                .fillMaxWidth()
                .height(52.dp)
                .background(accent)
                .cornerRadius(26.dp)
                .clickable(actionStartActivity(deepLinkIntent("savo://quick-capture")))
        ) {
            Text(
                "Quick Accident Capture",
                style = TextStyle(color = white, fontSize = 16.sp, fontWeight = FontWeight.Bold),
            )
        }
        Spacer(GlanceModifier.height(8.dp))

        // Roadside (wide) + 111 (compact red circle, separated to prevent fat-finger)
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            ActionButton(
                label = if (roadsidePhone.isNotEmpty()) roadsideName.take(16) else "Roadside",
                colorBg = ColorProvider(Color(0xFF0EA5E9)),
                colorFg = white,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(callIntent(roadsidePhone))
                ),
            )
            Spacer(GlanceModifier.width(16.dp))
            Box(
                contentAlignment = Alignment.Center,
                modifier = GlanceModifier
                    .size(52.dp)
                    .background(red)
                    .cornerRadius(26.dp)
                    .clickable(actionStartActivity(callIntent("111")))
            ) {
                Text("111", style = TextStyle(color = white, fontSize = 15.sp, fontWeight = FontWeight.Bold))
            }
        }
    }
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
    val dotColor = when (status) {
        ExpiryStatus.Ok -> ColorProvider(Color(0xFF16A34A))
        ExpiryStatus.Soon -> ColorProvider(Color(0xFFD97706))
        ExpiryStatus.Expired -> ColorProvider(Color(0xFFDC2626))
        ExpiryStatus.Unknown -> ColorProvider(Color(0xFFCBD5E1))
    }
    val valueText = when (status) {
        ExpiryStatus.Unknown -> "—"
        ExpiryStatus.Expired -> "Expired"
        else -> formatDaysLeft(isoDate)
    }
    val valueColor = if (status == ExpiryStatus.Expired)
        ColorProvider(Color(0xFFDC2626)) else text

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = GlanceModifier
                    .size(8.dp)
                    .background(dotColor)
                    .cornerRadius(4.dp),
            ) {}
            Spacer(GlanceModifier.width(5.dp))
            Text(label, style = TextStyle(color = muted, fontSize = 11.sp, fontWeight = FontWeight.Bold))
        }
        Spacer(GlanceModifier.height(3.dp))
        Text(
            valueText,
            style = TextStyle(color = valueColor, fontSize = 13.sp, fontWeight = FontWeight.Bold),
        )
    }
}

private fun formatDaysLeft(isoDate: String): String {
    if (isoDate.isBlank()) return "—"
    return try {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
        val target = fmt.parse(isoDate) ?: return "—"
        val today = fmt.parse(fmt.format(java.util.Date())) ?: return "—"
        val diff = TimeUnit.MILLISECONDS.toDays(target.time - today.time)
        when {
            diff > 1 -> "$diff days"
            diff == 1L -> "1 day"
            diff == 0L -> "Today"
            diff == -1L -> "-1 day"
            else -> "${diff}d"
        }
    } catch (_: Exception) { "—" }
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
            .height(52.dp)
            .background(colorBg)
            .cornerRadius(26.dp)
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

private suspend fun cycleVehicle(context: Context, glanceId: GlanceId, delta: Int) {
    val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
    val count = prefs.getInt("vehicles_count", 0)
    if (count > 1) {
        val current = prefs.getInt("vehicles_current_index", 0)
        val next = ((current + delta) % count + count) % count
        // apply() is async — does not block the main thread on disk I/O.
        prefs.edit().putInt("vehicles_current_index", next).apply()
    }
    // Update only this widget instance, not all — much faster and avoids
    // re-triggering the network refresh in onUpdate.
    SavoWidget().update(context, glanceId)
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
    }

    private fun refreshFromBackend(context: Context) {
        val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
        val token = prefs.getString("widget_token", null) ?: return
        val baseUrl = prefs.getString("supabase_url", null) ?: return
        val anon = prefs.getString("supabase_anon", null) ?: ""

        GlobalScope.launch(Dispatchers.IO) {
            try {
                val url = URL("$baseUrl/functions/v1/widget-data")
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
                for (i in 0 until prevCount.coerceAtLeast(10)) {
                    editor.remove("vehicle_${i}_rego")
                    editor.remove("vehicle_${i}_nickname")
                    editor.remove("vehicle_${i}_rego_expiry")
                    editor.remove("vehicle_${i}_wof_expiry")
                    editor.remove("vehicle_${i}_insurance_expiry")
                    editor.remove("vehicle_${i}_roadside_name")
                    editor.remove("vehicle_${i}_roadside_phone")
                }

                val vehiclesArr: JSONArray? = json.optJSONArray("vehicles")
                val total = minOf(10, vehiclesArr?.length() ?: 0)
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

                editor.apply()

                withContext(Dispatchers.Main) {
                    SavoWidget().updateAll(context)
                }
            } catch (_: Exception) {
                // keep showing cached data
            }
        }
    }
}
