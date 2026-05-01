package nz.co.savo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.webkit.JavascriptInterface
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONArray

/**
 * JavaScript bridge that the React app calls (window.SavoWidgetBridge) to
 * push the widget token + Supabase URL into the SharedPreferences file the
 * SavoWidget reads from.
 *
 * Wired up in MainActivity.onStart().
 */
class WidgetBridge(private val context: Context) {
    @JavascriptInterface
    fun setCredentials(token: String, supabaseUrl: String, anonKey: String) {
        context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
            .edit()
            .putString("widget_token", token)
            .putString("supabase_url", supabaseUrl)
            .putString("supabase_anon", anonKey)
            .remove("last_manual_refresh_ms")
            .apply()

        // Trigger an immediate backend refresh so the widget updates within seconds.
        CoroutineScope(Dispatchers.IO).launch {
            try { refreshFromBackend(context) } catch (_: Exception) {}
        }
    }

    @JavascriptInterface
    fun setVehicles(vehiclesJson: String) {
        try {
            val vehicles = JSONArray(vehiclesJson)
            val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
            val editor = prefs.edit()
            val previous = prefs.getInt("vehicles_count", 0)
            for (i in 0 until maxOf(previous, 10)) {
                editor.remove("vehicle_${i}_rego")
                editor.remove("vehicle_${i}_nickname")
                editor.remove("vehicle_${i}_rego_expiry")
                editor.remove("vehicle_${i}_wof_expiry")
                editor.remove("vehicle_${i}_insurance_expiry")
                editor.remove("vehicle_${i}_roadside_name")
                editor.remove("vehicle_${i}_roadside_phone")
            }
            var total = 0
            for (i in 0 until vehicles.length()) {
                if (total >= 10) break
                val v = vehicles.optJSONObject(i) ?: continue
                val rego = v.optString("rego", "").trim()
                if (rego.isBlank()) continue
                editor.putString("vehicle_${total}_rego", rego)
                editor.putString("vehicle_${total}_nickname", v.optString("nickname", ""))
                editor.putString("vehicle_${total}_rego_expiry", v.optString("regoExpiry", ""))
                editor.putString("vehicle_${total}_wof_expiry", v.optString("wofExpiry", ""))
                editor.putString("vehicle_${total}_insurance_expiry", v.optString("insuranceExpiry", ""))
                editor.putString("vehicle_${total}_roadside_name", v.optString("roadsideName", "Roadside"))
                editor.putString("vehicle_${total}_roadside_phone", v.optString("roadsidePhone", ""))
                total++
            }
            editor.putInt("vehicles_count", total)
            val current = prefs.getInt("vehicles_current_index", 0)
            if (total == 0 || current >= total) editor.putInt("vehicles_current_index", 0)
            editor.putBoolean("widget_refreshing", false)
            editor.putLong("widget_last_local_sync_ms", System.currentTimeMillis())
            editor.commit()
            CoroutineScope(Dispatchers.Main).launch {
                SavoWidget().updateAll(context)
            }
        } catch (_: Exception) {
            // Keep the existing widget cache if parsing fails.
        }
    }

    /**
     * Ask Android to pin the SAVO home-screen widget. On Android 8.0+ the
     * launcher shows the system "Add to home screen?" confirmation dialog.
     * Returns:
     *   "ok"          – pin request was dispatched
     *   "unsupported" – launcher does not support requestPinAppWidget
     *   "old_os"      – running below Android 8.0
     *   "error:..."   – exception thrown
     */
    @JavascriptInterface
    fun requestPinWidget(): String {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return "old_os"
        return try {
            val awm = AppWidgetManager.getInstance(context)
            if (!awm.isRequestPinAppWidgetSupported) return "unsupported"
            val provider = ComponentName(context, SavoWidgetReceiver::class.java)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            val callback = PendingIntent.getBroadcast(
                context,
                0,
                Intent(context, SavoWidgetReceiver::class.java).setAction("nz.co.savo.app.WIDGET_PINNED"),
                flags,
            )
            val ok = awm.requestPinAppWidget(provider, null, callback)
            if (ok) "ok" else "unsupported"
        } catch (e: Exception) {
            "error:${e.message}"
        }
    }
}
