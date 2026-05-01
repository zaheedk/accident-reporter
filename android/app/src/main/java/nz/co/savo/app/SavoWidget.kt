package nz.co.savo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.os.Build
import android.os.Bundle
import android.widget.RemoteViews
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/*
 * Minimal, reliable home-screen widget.
 *
 * Design goals (per user feedback):
 *  - Show ONLY the current vehicle's rego plate.
 *  - Tapping the plate cycles to the next vehicle, instantly and reliably.
 *
 * Implementation: classic AppWidgetProvider + RemoteViews + a single
 * Activity PendingIntent. This is the most battle-tested Android widget
 * stack and avoids the launcher coalescing / hit-testing issues we hit
 * with Glance ActionCallbacks.
 */

internal const val WIDGET_PREFS = "savo_widget_prefs"
private const val ACTION_NEXT_VEHICLE = "nz.co.savo.app.widget.NEXT_VEHICLE"
private const val MAX_WIDGET_VEHICLES = 10

/**
 * Transparent activity invoked by tapping the rego plate. It increments
 * the cached current-vehicle index, redraws all widget instances, then
 * finishes immediately. Using a real Activity (not a BroadcastReceiver
 * or Glance ActionCallback) gives us the most reliable tap behaviour
 * across launchers — taps land in <100ms with no coalescing.
 */
class WidgetVehicleSwitchActivity : android.app.Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val prefs = getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt("vehicles_count", 0)
        if (count > 1) {
            val current = prefs.getInt("vehicles_current_index", 0)
            val next = nextVehicleIndex(prefs, current, count)
            if (next != current) {
                prefs.edit()
                    .putInt("vehicles_current_index", next)
                    .commit()
            }
        }
        SavoWidgetReceiver.redrawAll(applicationContext)
        finish()
        overridePendingTransition(0, 0)
    }
}

/**
 * Classic AppWidgetProvider — handles drawing and tap wiring.
 * Glance is no longer used; we kept the GlanceAppWidget class shell
 * only so existing references in the bridge compile.
 */
class SavoWidgetReceiver : AppWidgetProvider() {

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
        // Kick off a background refresh so the cached rego stays fresh.
        refreshFromBackend(context)
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle?,
    ) {
        renderWidget(context, appWidgetManager, appWidgetId)
    }

    companion object {
        fun redrawAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, SavoWidgetReceiver::class.java))
            for (id in ids) renderWidget(context, mgr, id)
        }

        private fun renderWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int,
        ) {
            val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
            val count = prefs.getInt("vehicles_count", 0)
            val rawIndex = if (count > 0) prefs.getInt("vehicles_current_index", 0).coerceAtLeast(0) % count else 0
            val index = when {
                count <= 0 -> 0
                vehicleRegoAt(prefs, rawIndex).isNotBlank() -> rawIndex
                else -> nextVehicleIndex(prefs, rawIndex, count)
            }
            if (index != rawIndex) prefs.edit().putInt("vehicles_current_index", index).commit()
            val rego = if (count > 0) vehicleRegoAt(prefs, index) else ""

            val regoExpiry = if (count > 0) prefs.getString("vehicle_${index}_rego_expiry", "") ?: "" else ""
            val wofExpiry = if (count > 0) prefs.getString("vehicle_${index}_wof_expiry", "") ?: "" else ""
            val insExpiry = if (count > 0) prefs.getString("vehicle_${index}_insurance_expiry", "") ?: "" else ""

            val views = RemoteViews(context.packageName, R.layout.widget_savo)
            views.setImageViewBitmap(R.id.widget_plate, regoPlateBitmap(rego))
            views.setImageViewBitmap(R.id.widget_rings, expiryRingsBitmap(regoExpiry, wofExpiry, insExpiry))
            views.setOnClickPendingIntent(R.id.widget_plate, switchPendingIntent(context))

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun switchPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, WidgetVehicleSwitchActivity::class.java).apply {
                action = ACTION_NEXT_VEHICLE
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            // requestCode = 0 is fine since the intent is identical for all instances.
            return PendingIntent.getActivity(context, 0, intent, flags)
        }
    }
}

/**
 * Kept as a compile-time placeholder for any lingering references in
 * the JS bridge — not actually used by Glance anymore.
 */
class SavoWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
        // No-op: we render via classic RemoteViews now.
    }
    suspend fun updateAll(context: Context) {
        withContext(Dispatchers.Main) {
            SavoWidgetReceiver.redrawAll(context)
        }
    }
}

private fun vehicleRegoAt(prefs: SharedPreferences, index: Int): String =
    (prefs.getString("vehicle_${index}_rego", "") ?: "").trim()

private fun nextVehicleIndex(prefs: SharedPreferences, current: Int, count: Int): Int {
    if (count <= 1) return current.coerceAtLeast(0)
    for (step in 1..count) {
        val candidate = ((current + step) % count + count) % count
        if (vehicleRegoAt(prefs, candidate).isNotBlank()) return candidate
    }
    return current.coerceAtLeast(0) % count
}

private fun regoPlateBitmap(rego: String): Bitmap {
    val w = 800
    val h = 240
    val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFBBF24.toInt()
        style = Paint.Style.FILL
    }
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF111827.toInt()
        style = Paint.Style.STROKE
        strokeWidth = 8f
    }
    val regoPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF111827.toInt()
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
        textSize = 110f
        typeface = android.graphics.Typeface.create(android.graphics.Typeface.SANS_SERIF, android.graphics.Typeface.BOLD)
    }
    val rect = RectF(8f, 8f, w - 8f, h - 8f)
    canvas.drawRoundRect(rect, 36f, 36f, bg)
    canvas.drawRoundRect(rect, 36f, 36f, stroke)
    canvas.drawText(rego.trim(), w / 2f, 155f, regoPaint)
    return bitmap
}

/**
 * Parse a yyyy-MM-dd (or ISO) date string and return whole days from
 * today until that date. Returns null if unparseable / blank.
 */
private fun daysUntil(dateStr: String): Int? {
    val s = dateStr.trim()
    if (s.isBlank()) return null
    return try {
        val datePart = s.substring(0, minOf(10, s.length))
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
        fmt.isLenient = false
        val target = fmt.parse(datePart) ?: return null
        val cal = java.util.Calendar.getInstance().apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0)
            set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0)
            set(java.util.Calendar.MILLISECOND, 0)
        }
        val today = cal.timeInMillis
        val diff = target.time - today
        Math.floor(diff / (1000.0 * 60 * 60 * 24)).toInt()
    } catch (_: Exception) {
        null
    }
}

/**
 * Render three progress rings (REGO, WOF, Insurance) showing days
 * remaining. Ring fill is proportional to days/365 (clamped 0..1).
 * Color: green >=30 days, amber <30, red <7. Grey if unknown.
 */
private fun expiryRingsBitmap(rego: String, wof: String, ins: String): Bitmap {
    val w = 900
    val h = 320
    val bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val labels = listOf("REGO", "WOF", "INS")
    val days = listOf(daysUntil(rego), daysUntil(wof), daysUntil(ins))
    val cellW = w / 3f
    val ringMax = 110f
    val cy = 130f
    val stroke = 18f

    val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFE5E7EB.toInt()
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
    }
    val arcPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
    }
    val centerText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF111827.toInt()
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
        textSize = 44f
    }
    val unitText = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF6B7280.toInt()
        textAlign = Paint.Align.CENTER
        textSize = 22f
    }
    val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFFFFFFFF.toInt()
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
        textSize = 32f
    }

    for (i in 0..2) {
        val cx = cellW * i + cellW / 2f
        val d = days[i]
        val fraction = when {
            d == null -> 0f
            d <= 0 -> 0f
            else -> (d.toFloat() / 365f).coerceIn(0f, 1f)
        }
        val color = when {
            d == null -> 0xFF9CA3AF.toInt()
            d < 7 -> 0xFFDC2626.toInt()
            d < 30 -> 0xFFF59E0B.toInt()
            else -> 0xFF10B981.toInt()
        }
        // Radius scales with fraction: full at 365+ days, shrink as days drop.
        // Minimum 45% so the ring stays visible/legible even when expired.
        val radius = ringMax * (0.45f + 0.55f * fraction)
        val rect = RectF(cx - radius, cy - radius, cx + radius, cy + radius)
        canvas.drawArc(rect, 0f, 360f, false, trackPaint)
        arcPaint.color = color
        if (fraction > 0f) {
            canvas.drawArc(rect, -90f, 360f * fraction, false, arcPaint)
        }
        val centerStr = when {
            d == null -> "—"
            d <= 0 -> "0"
            else -> d.toString()
        }
        canvas.drawText(centerStr, cx, cy + 12f, centerText)
        canvas.drawText(if (d == null) "no date" else "days", cx, cy + 42f, unitText)

        // Label pill below ring
        val pillW = 130f
        val pillH = 44f
        val pillRect = RectF(cx - pillW / 2f, h - pillH - 12f, cx + pillW / 2f, h - 12f)
        val pillBg = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color
            style = Paint.Style.FILL
        }
        canvas.drawRoundRect(pillRect, 22f, 22f, pillBg)
        canvas.drawText(labels[i], cx, h - 22f, labelPaint)
    }
    return bitmap
}
internal fun refreshFromBackend(context: Context) {
    val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
    val token = prefs.getString("widget_token", null)
    val baseUrl = prefs.getString("supabase_url", null)
    if (token.isNullOrBlank() || baseUrl.isNullOrBlank()) return
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

            val vehiclesArr: JSONArray? = json.optJSONArray("vehicles")
            val totalAvailable = vehiclesArr?.length() ?: 0
            val prevCount = prefs.getInt("vehicles_count", 0)
            if (totalAvailable == 0 && prevCount > 0) return@launch

            val editor = prefs.edit()
            for (i in 0 until maxOf(prevCount, MAX_WIDGET_VEHICLES)) {
                editor.remove("vehicle_${i}_rego")
                editor.remove("vehicle_${i}_rego_expiry")
                editor.remove("vehicle_${i}_wof_expiry")
                editor.remove("vehicle_${i}_insurance_expiry")
            }
            var total = 0
            if (vehiclesArr != null) {
                for (i in 0 until totalAvailable) {
                    if (total >= MAX_WIDGET_VEHICLES) break
                    val v = vehiclesArr.optJSONObject(i) ?: continue
                    val rego = v.optString("rego", "").trim()
                    if (rego.isBlank()) continue
                    editor.putString("vehicle_${total}_rego", rego)
                    editor.putString("vehicle_${total}_rego_expiry", v.optString("regoExpiry", ""))
                    editor.putString("vehicle_${total}_wof_expiry", v.optString("wofExpiry", ""))
                    editor.putString("vehicle_${total}_insurance_expiry", v.optString("insuranceExpiry", ""))
                    total++
                }
            }
            if (total == 0 && prevCount > 0) return@launch
            editor.putInt("vehicles_count", total)
            val curIdx = prefs.getInt("vehicles_current_index", 0)
            if (total == 0 || curIdx >= total) editor.putInt("vehicles_current_index", 0)
            editor.commit()

            withContext(Dispatchers.Main) {
                SavoWidgetReceiver.redrawAll(context)
            }
        } catch (_: Exception) {
            // keep showing cached data
        }
    }
}
