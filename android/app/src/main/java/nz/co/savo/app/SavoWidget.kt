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

            val views = RemoteViews(context.packageName, R.layout.widget_savo)
            views.setImageViewBitmap(R.id.widget_plate, regoPlateBitmap(rego))
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
 * Background refresh from the widget-data edge function. Updates the
 * vehicle cache in SharedPreferences then redraws all widgets.
 */
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
            val total = minOf(MAX_WIDGET_VEHICLES, vehiclesArr?.length() ?: 0)
            val prevCount = prefs.getInt("vehicles_count", 0)
            if (total == 0 && prevCount > 0) return@launch

            val editor = prefs.edit()
            for (i in 0 until maxOf(prevCount, MAX_WIDGET_VEHICLES)) {
                editor.remove("vehicle_${i}_rego")
            }
            editor.putInt("vehicles_count", total)
            if (vehiclesArr != null) {
                for (i in 0 until total) {
                    val v = vehiclesArr.optJSONObject(i) ?: continue
                    editor.putString("vehicle_${i}_rego", v.optString("rego", ""))
                }
            }
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
