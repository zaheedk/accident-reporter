package nz.co.savo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.action.actionStartActivity as actionStartActivityNoOp
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
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.action.ActionParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

class SavoWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)

            val claims = (0 until 2).map { i ->
                val ref = prefs.getString("claim_${i}_ref", null) ?: ""
                val status = prefs.getString("claim_${i}_status", null) ?: ""
                ClaimItem(ref, status)
            }.filter { it.ref.isNotEmpty() || it.status.isNotEmpty() }

            val expiries = (0 until 2).map { i ->
                val kind = prefs.getString("expiry_${i}_kind", null) ?: ""
                val date = prefs.getString("expiry_${i}_date", null) ?: ""
                val vehicle = prefs.getString("expiry_${i}_vehicle", null) ?: ""
                ExpiryItem(kind, date, vehicle)
            }.filter { it.kind.isNotEmpty() }

            val insurerPhone = prefs.getString("insurer_phone", null) ?: ""
            val insurerName = prefs.getString("insurer_name", null) ?: "Insurer"

            // Vehicle list cached as flat strings: vehicles_count + per-index fields
            val vehicleCount = prefs.getInt("vehicles_count", 0)
            val currentIndex = if (vehicleCount > 0) {
                prefs.getInt("vehicles_current_index", 0).coerceAtLeast(0) % vehicleCount
            } else 0

            val rego = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_rego", "") ?: ""
            else (prefs.getString("vehicle_rego", null) ?: "")
            val roadsidePhone = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_roadside_phone", "") ?: ""
            else (prefs.getString("roadside_phone", null) ?: "")
            val roadsideName = if (vehicleCount > 0)
                prefs.getString("vehicle_${currentIndex}_roadside_name", "") ?: "Roadside"
            else (prefs.getString("roadside_name", null) ?: "Roadside")

            WidgetBody(
                claims = claims,
                expiries = expiries,
                insurerName = insurerName,
                insurerPhone = insurerPhone,
                roadsideName = roadsideName,
                roadsidePhone = roadsidePhone,
                rego = rego,
                showSwitch = vehicleCount > 1,
            )
        }
    }
}

private data class ClaimItem(val ref: String, val status: String)
private data class ExpiryItem(val kind: String, val date: String, val vehicle: String)

@Composable
private fun WidgetBody(
    claims: List<ClaimItem>,
    expiries: List<ExpiryItem>,
    insurerName: String,
    insurerPhone: String,
    roadsideName: String,
    roadsidePhone: String,
    rego: String,
    showSwitch: Boolean,
) {
    val bg = ColorProvider(Color(0xFF0F172A))
    val fg = ColorProvider(Color(0xFFFFFFFF))
    val muted = ColorProvider(Color(0xFF94A3B8))
    val accent = ColorProvider(Color(0xFFF26B1F))
    val plateBg = ColorProvider(Color(0xFFFBBF24))
    val plateFg = ColorProvider(Color(0xFF111827))
    val switchBg = ColorProvider(Color(0xFF334155))

    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(bg)
            .cornerRadius(20.dp)
            .padding(12.dp)
    ) {
        // Header row: SAVO + rego plate (+ prev/next vehicle buttons if multiple vehicles)
        Row(modifier = GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "SAVO",
                style = TextStyle(color = accent, fontSize = 12.sp, fontWeight = FontWeight.Bold),
            )
            Spacer(GlanceModifier.defaultWeight())
            if (showSwitch) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .background(switchBg)
                        .cornerRadius(8.dp)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                        .clickable(actionRunCallback<PrevVehicleAction>())
                ) {
                    Text("◀", style = TextStyle(color = fg, fontSize = 13.sp, fontWeight = FontWeight.Bold))
                }
                Spacer(GlanceModifier.width(6.dp))
            }
            if (rego.isNotEmpty()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .background(plateBg)
                        .cornerRadius(6.dp)
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(rego, style = TextStyle(color = plateFg, fontSize = 13.sp, fontWeight = FontWeight.Bold))
                }
            }
            if (showSwitch) {
                Spacer(GlanceModifier.width(6.dp))
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = GlanceModifier
                        .background(switchBg)
                        .cornerRadius(8.dp)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                        .clickable(actionRunCallback<NextVehicleAction>())
                ) {
                    Text("▶", style = TextStyle(color = fg, fontSize = 13.sp, fontWeight = FontWeight.Bold))
                }
            }
        }
        Spacer(GlanceModifier.height(6.dp))

        // Claims removed — widget focuses on vehicle, expiries, and quick actions.

        // Expiries section
        Text(
            text = "Upcoming expiries",
            style = TextStyle(color = muted, fontSize = 10.sp, fontWeight = FontWeight.Bold),
        )
        if (expiries.isEmpty()) {
            Text("No upcoming expiries", style = TextStyle(color = fg, fontSize = 11.sp))
        } else {
            expiries.forEach { e ->
                Text(
                    text = "${e.kind} · ${e.date}${if (e.vehicle.isNotEmpty()) " · ${e.vehicle}" else ""}",
                    style = TextStyle(color = fg, fontSize = 11.sp),
                    maxLines = 1,
                )
            }
        }

        Spacer(GlanceModifier.defaultWeight())

        // Action row 1: Capture + Insurer
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
                label = insurerName.take(10),
                colorBg = ColorProvider(Color(0xFF1E293B)),
                colorFg = fg,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(callIntent(insurerPhone))
                ),
            )
        }
        Spacer(GlanceModifier.height(6.dp))
        // Action row 2: Roadside + 111
        Row(modifier = GlanceModifier.fillMaxWidth()) {
            ActionButton(
                label = if (roadsidePhone.isNotEmpty()) roadsideName.take(10) else "Roadside",
                colorBg = ColorProvider(Color(0xFF0EA5E9)),
                colorFg = fg,
                modifier = GlanceModifier.defaultWeight().clickable(
                    actionStartActivity(callIntent(roadsidePhone))
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

/** Cycles to the next vehicle in the cached list and re-renders. */
class NextVehicleAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
        val count = prefs.getInt("vehicles_count", 0)
        if (count > 1) {
            val current = prefs.getInt("vehicles_current_index", 0)
            val next = (current + 1) % count
            prefs.edit().putInt("vehicles_current_index", next).commit()
        }
        SavoWidget().updateAll(context)
    }
}

/** Cycles to the previous vehicle in the cached list and re-renders. */
class PrevVehicleAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters,
    ) {
        val prefs = context.getSharedPreferences("savo_widget_prefs", Context.MODE_PRIVATE)
        val count = prefs.getInt("vehicles_count", 0)
        if (count > 1) {
            val current = prefs.getInt("vehicles_current_index", 0)
            val prev = (current - 1 + count) % count
            prefs.edit().putInt("vehicles_current_index", prev).commit()
        }
        SavoWidget().updateAll(context)
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

                // Clear previous (we now show 2, but clear up to 3 for safety on upgrade)
                for (i in 0 until 3) {
                    editor.remove("claim_${i}_ref")
                    editor.remove("claim_${i}_status")
                    editor.remove("expiry_${i}_kind")
                    editor.remove("expiry_${i}_date")
                    editor.remove("expiry_${i}_vehicle")
                }
                // Clear previous vehicle list (up to 10 cached)
                val prevCount = prefs.getInt("vehicles_count", 0)
                for (i in 0 until prevCount.coerceAtLeast(10)) {
                    editor.remove("vehicle_${i}_rego")
                    editor.remove("vehicle_${i}_roadside_name")
                    editor.remove("vehicle_${i}_roadside_phone")
                }

                val claimsArr = json.optJSONArray("claims")
                if (claimsArr != null) {
                    for (i in 0 until minOf(2, claimsArr.length())) {
                        val c = claimsArr.optJSONObject(i) ?: continue
                        editor.putString("claim_${i}_ref", c.optString("reportNumber", ""))
                        editor.putString("claim_${i}_status", c.optString("status", ""))
                    }
                }

                val expiriesArr = json.optJSONArray("nextExpiries")
                if (expiriesArr != null) {
                    for (i in 0 until minOf(2, expiriesArr.length())) {
                        val e = expiriesArr.optJSONObject(i) ?: continue
                        editor.putString("expiry_${i}_kind", e.optString("kind", ""))
                        editor.putString("expiry_${i}_date", e.optString("date", ""))
                        editor.putString("expiry_${i}_vehicle", e.optString("rego", e.optString("vehicle", "")))
                    }
                }

                json.optJSONObject("contacts")?.optJSONObject("insurer")?.let { ins ->
                    editor.putString("insurer_name", ins.optString("name", "Insurer"))
                    editor.putString("insurer_phone", ins.optString("phone", ""))
                } ?: run {
                    editor.putString("insurer_name", "Insurer")
                    editor.putString("insurer_phone", "")
                }

                // Cache vehicle list (up to 10) for cycling on the widget
                val vehiclesArr: JSONArray? = json.optJSONArray("vehicles")
                val total = minOf(10, vehiclesArr?.length() ?: 0)
                editor.putInt("vehicles_count", total)
                if (vehiclesArr != null) {
                    for (i in 0 until total) {
                        val v = vehiclesArr.optJSONObject(i) ?: continue
                        editor.putString("vehicle_${i}_rego", v.optString("rego", ""))
                        editor.putString("vehicle_${i}_roadside_name", v.optString("roadsideName", "Roadside"))
                        editor.putString("vehicle_${i}_roadside_phone", v.optString("roadsidePhone", ""))
                    }
                }
                // Reset current index if it falls outside the new list
                val curIdx = prefs.getInt("vehicles_current_index", 0)
                if (total == 0 || curIdx >= total) editor.putInt("vehicles_current_index", 0)

                // Legacy single-vehicle fields kept for backward compatibility
                json.optJSONObject("vehicle")?.let { v ->
                    editor.putString("vehicle_rego", v.optString("rego", ""))
                } ?: run {
                    editor.putString("vehicle_rego", "")
                }
                json.optJSONObject("contacts")?.optJSONObject("roadside")?.let { rs ->
                    editor.putString("roadside_name", rs.optString("name", "Roadside"))
                    editor.putString("roadside_phone", rs.optString("phone", ""))
                } ?: run {
                    editor.putString("roadside_name", "Roadside")
                    editor.putString("roadside_phone", "")
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
