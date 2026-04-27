package nz.co.savo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.webkit.JavascriptInterface
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

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
            .apply()

        // Trigger an immediate refresh so the widget updates within seconds.
        CoroutineScope(Dispatchers.IO).launch {
            try { SavoWidget().updateAll(context) } catch (_: Exception) {}
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
