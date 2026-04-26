package nz.co.savo.app

import android.content.Context
import android.webkit.JavascriptInterface
import com.getcapacitor.BridgeActivity
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
}
