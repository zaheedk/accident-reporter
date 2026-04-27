package nz.co.savo.app

import android.content.Context
import android.content.Intent
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import androidx.glance.unit.ColorProvider
import androidx.glance.GlanceModifier
import androidx.glance.background
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.layout.Alignment
import androidx.glance.appwidget.updateAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Home-screen widget that shows the user's latest claim, next vehicle expiry,
 * and three one-tap actions (Quick Capture, Call insurer, Call 111).
 *
 * Data is fetched in the background by SavoWidgetReceiver.onUpdate() via the
 * `widget-data` Supabase edge function and cached in SharedPreferences. The
 * Composable below renders only what's already in the cache so first paint
 * is instant.
 */
class SavoWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
            val claimStatus = prefs.getString("claim_status", null) ?: "No active claim"
            val claimRef = prefs.getString("claim_ref", null) ?: ""
            val expiryKind = prefs.getString("expiry_kind", null) ?: ""
            val expiryDate = prefs.getString("expiry_date", null) ?: ""
            val expiryVehicle = prefs.getString("expiry_vehicle", null) ?: ""
            val insurerPhone = prefs.getString("insurer_phone", null) ?: ""
            val insurerName = prefs.getString("insurer_name", null) ?: "Insurer"

            WidgetBody(
                claimStatus = claimStatus,
                claimRef = claimRef,
                expiryLine = if (expiryKind.isNotEmpty())
                    "$expiryKind · $expiryDate${if (expiryVehicle.isNotEmpty()) " · $expiryVehicle" else ""}"
                else "No upcoming expiries",
                insurerName = insurerName,
                insurerPhone = insurerPhone,
            )
        }
    }
}

@Composable
private fun WidgetBody(
    claimStatus: String,
    claimRef: String,
    expiryLine: String,
    insurerName: String,
    insurerPhone: String,
) {
    val bg = ColorProvider(Color(0xFF0F172A))
    val fg = ColorProvider(Color(0xFFFFFFFF))
    val muted = ColorProvider(Color(0xFF94A3B8))
    val accent = ColorProvider(Color(0xFFF26B1F))

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(bg)
            .cornerRadius(20.dp)
            .padding(12.dp)
    ) {
        Text(
            text = "SAVO",
            style = TextStyle(color = accent, fontSize = 12.sp, fontWeight = FontWeight.Bold),
        )
        Spacer(GlanceModifier.height(4.dp))
        Text(
            text = if (claimRef.isNotEmpty()) "Claim $claimRef" else "Latest claim",
            style = TextStyle(color = fg, fontSize = 13.sp, fontWeight = FontWeight.Medium),
        )
        Text(
            text = claimStatus,
            style = TextStyle(color = muted, fontSize = 11.sp),
        )
        Spacer(GlanceModifier.height(8.dp))
        Text(
            text = expiryLine,
            style = TextStyle(color = fg, fontSize = 11.sp),
        )
        Spacer(GlanceModifier.defaultWeight())

        // Action row
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            ActionButton(
                label = "Capture",
                colorBg = accent,
                colorFg = fg,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(deepLinkIntent("savo://quick-capture"))
                ),
            )
            Spacer(GlanceModifier.width(6.dp))
            ActionButton(
                label = insurerName.take(8),
                colorBg = ColorProvider(Color(0xFF1E293B)),
                colorFg = fg,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(callIntent(insurerPhone))
                ),
            )
            Spacer(GlanceModifier.width(6.dp))
            ActionButton(
                label = "111",
                colorBg = ColorProvider(Color(0xFFB91C1C)),
                colorFg = fg,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(callIntent("111"))
                ),
            )
        }
    }
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
            .height(36.dp)
            .background(colorBg)
            .cornerRadius(10.dp)
    ) {
        Text(label, style = TextStyle(color = colorFg, fontSize = 11.sp, fontWeight = FontWeight.Bold))
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
                json.optJSONObject("claim")?.let { c ->
                    editor.putString("claim_ref", c.optString("reportNumber", ""))
                    editor.putString("claim_status", c.optString("status", "draft"))
                } ?: run {
                    editor.putString("claim_ref", "")
                    editor.putString("claim_status", "No active claim")
                }
                json.optJSONObject("nextExpiry")?.let { e ->
                    editor.putString("expiry_kind", e.optString("kind", ""))
                    editor.putString("expiry_date", e.optString("date", ""))
                    editor.putString("expiry_vehicle", e.optString("rego", e.optString("vehicle", "")))
                } ?: run {
                    editor.putString("expiry_kind", "")
                    editor.putString("expiry_date", "")
                    editor.putString("expiry_vehicle", "")
                }
                json.optJSONObject("contacts")?.optJSONObject("insurer")?.let { ins ->
                    editor.putString("insurer_name", ins.optString("name", "Insurer"))
                    editor.putString("insurer_phone", ins.optString("phone", ""))
                } ?: run {
                    editor.putString("insurer_name", "Insurer")
                    editor.putString("insurer_phone", "")
                }
                editor.apply()

                withContext(Dispatchers.Main) {
                    SavoWidget().updateAll(context)
                }
            } catch (e: Exception) {
                // Network failure is fine — widget will keep showing cached data
            }
        }
    }
}
