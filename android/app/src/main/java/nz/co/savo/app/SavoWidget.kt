package nz.co.savo.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.res.Resources
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.RemoteViews
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/*
 * Home-screen widget — 2x3 cells.
 *
 * Layout (single bitmap that scales to fit):
 *   ┌──────────────────────────────┐
 *   │ QPY 356                      │
 *   │ • Insurance  • WOF  • Rego   │
 *   │ ┌────────┐  ┌──────┐         │
 *   │ │ rings  │  │ SAVO │         │
 *   │ │  ◯◯◯  │  │ tile │         │
 *   │ └────────┘  └──────┘         │
 *   │ ──────────────────────────── │
 *   │         TAP TO CALL          │
 *   │   ⊙        🚛        🚑      │
 *   │ Roadside  Tow Truck Emergency│
 *   └──────────────────────────────┘
 */

internal const val WIDGET_PREFS = "savo_widget_prefs"
private const val ACTION_NEXT_VEHICLE = "nz.co.savo.app.widget.NEXT_VEHICLE"
private const val MAX_WIDGET_VEHICLES = 10

class SavoWidgetReceiver : AppWidgetProvider() {

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action != ACTION_NEXT_VEHICLE) return

        val prefs = context.getSharedPreferences(WIDGET_PREFS, Context.MODE_PRIVATE)
        val count = prefs.getInt("vehicles_count", 0)
        if (count > 1) {
            val current = prefs.getInt("vehicles_current_index", 0)
            val next = nextVehicleIndex(prefs, current, count)
            if (next != current) {
                prefs.edit().putInt("vehicles_current_index", next).commit()
            }
        }
        redrawAll(context.applicationContext)
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray,
    ) {
        for (id in appWidgetIds) {
            renderWidget(context, appWidgetManager, id)
        }
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
            val roadsidePhone = if (count > 0) prefs.getString("vehicle_${index}_roadside_phone", "") ?: "" else ""

            // Render at a fixed high-resolution canvas; the ImageView (fitCenter)
            // scales it crisply to whatever cell size the user picks.
            val views = RemoteViews(context.packageName, R.layout.widget_savo)
            val bmp = renderCardBitmap(rego, regoExpiry, wofExpiry, insExpiry)
            views.setImageViewBitmap(R.id.widget_canvas, bmp)

            views.setOnClickPendingIntent(R.id.widget_plate_area, switchPendingIntent(context))
            views.setOnClickPendingIntent(R.id.widget_savo_icon, deepLinkPendingIntent(context, 1002, "savo://quick-capture"))
            views.setOnClickPendingIntent(
                R.id.widget_call_roadside,
                if (roadsidePhone.isNotBlank()) telPendingIntent(context, 1003, roadsidePhone)
                else deepLinkPendingIntent(context, 1003, "savo://dashboard"),
            )
            views.setOnClickPendingIntent(R.id.widget_call_tow, deepLinkPendingIntent(context, 1004, "savo://tow-companies"))
            views.setOnClickPendingIntent(R.id.widget_call_emergency, telPendingIntent(context, 1005, "111"))

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        private fun deepLinkPendingIntent(context: Context, requestCode: Int, uri: String): PendingIntent {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
                setPackage(context.packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            return PendingIntent.getActivity(context, requestCode, intent, flags)
        }

        private fun telPendingIntent(context: Context, requestCode: Int, phone: String): PendingIntent {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone.replace(" ", ""))).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            return PendingIntent.getActivity(context, requestCode, intent, flags)
        }

        private fun switchPendingIntent(context: Context): PendingIntent {
            val intent = Intent(context, SavoWidgetReceiver::class.java).apply {
                action = ACTION_NEXT_VEHICLE
            }
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_IMMUTABLE else 0
            return PendingIntent.getBroadcast(context, 1001, intent, flags)
        }
    }
}

/** Compile-time placeholder for lingering references in the JS bridge. */
class SavoWidget {
    suspend fun updateAll(context: Context) {
        withContext(Dispatchers.Main) {
            SavoWidgetReceiver.redrawAll(context)
        }
    }
}

private fun daysUntil(dateStr: String?): Int? {
    if (dateStr.isNullOrBlank()) return null
    return try {
        val datePart = dateStr.substring(0, minOf(10, dateStr.length))
        val fmt = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).apply {
            isLenient = false
            timeZone = java.util.TimeZone.getTimeZone("UTC")
        }
        val target = fmt.parse(datePart) ?: return null
        val nowCal = java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC")).apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0)
            set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0)
            set(java.util.Calendar.MILLISECOND, 0)
        }
        val diffMs = target.time - nowCal.timeInMillis
        (diffMs / (1000L * 60 * 60 * 24)).toInt()
    } catch (_: Exception) {
        null
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

// =============================================================================
// Card renderer — draws the entire widget UI as a single high-res bitmap.
// =============================================================================

// Canvas designed at 2:3 portrait aspect → matches the 2x3 cell widget shape.
private const val CARD_W = 600
private const val CARD_H = 900

private val GREEN = 0xFF22C55E.toInt()
private val AMBER = 0xFFF5C56B.toInt()
private val BLUE = 0xFF6BB6F5.toInt()
private val ORANGE = 0xFFFF6A2C.toInt()
private val INK = 0xFF111113.toInt()
private val MUTED = 0xFF9CA3AF.toInt()
private val TRACK = 0xFFE5E7EB.toInt()
private val DIVIDER = 0xFFEDEDEF.toInt()
private val PILL_BG = 0xFFF1F1F4.toInt()

private fun renderCardBitmap(
    rego: String,
    regoExp: String,
    wofExp: String,
    insExp: String,
): Bitmap {
    val bmp = Bitmap.createBitmap(CARD_W, CARD_H, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bmp)

    // Card background
    val bgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE }
    val cardRect = RectF(0f, 0f, CARD_W.toFloat(), CARD_H.toFloat())
    canvas.drawRoundRect(cardRect, 36f, 36f, bgPaint)

    val pad = 36f
    var y = pad + 28f

    // ── Title ───────────────────────────────────────────────────────────────
    val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK
        textAlign = Paint.Align.LEFT
        isFakeBoldText = true
        textSize = 70f
        letterSpacing = -0.01f
        typeface = Typeface.create("sans-serif", Typeface.BOLD)
    }
    val titleText = formatRego(rego)
    canvas.drawText(titleText, pad, y + 50f, titlePaint)
    y += 80f

    // ── Legend row ──────────────────────────────────────────────────────────
    val legendPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.LEFT
        textSize = 24f
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    }
    val dotR = 7f
    val items = listOf(
        Triple("Insurance", GREEN, true),
        Triple("WOF", AMBER, false),
        Triple("Rego", BLUE, false),
    )
    var lx = pad
    val ly = y + 24f
    for ((label, color, bold) in items) {
        val dot = Paint(Paint.ANTI_ALIAS_FLAG).apply { this.color = color; style = Paint.Style.FILL }
        canvas.drawCircle(lx + dotR, ly - 8f, dotR, dot)
        legendPaint.color = if (bold) INK else MUTED
        legendPaint.isFakeBoldText = bold
        canvas.drawText(label, lx + dotR * 2 + 8f, ly, legendPaint)
        lx += dotR * 2 + 8f + legendPaint.measureText(label) + 22f
    }
    y += 50f

    // ── Rings + SAVO tile row ──────────────────────────────────────────────
    val rowH = 280f
    val rowTop = y
    val rowBottom = y + rowH

    // Rings (left)
    drawRings(canvas,
        cx = pad + 130f,
        cy = (rowTop + rowBottom) / 2f,
        outerR = 110f,
        stroke = 22f,
        insDays = daysUntil(insExp),
        wofDays = daysUntil(wofExp),
        regoDays = daysUntil(regoExp),
    )

    // SAVO tile (right)
    val tileSize = 150f
    val tileLeft = CARD_W - pad - tileSize - 10f
    val tileTop = rowTop + 30f
    drawSavoTile(canvas, tileLeft, tileTop, tileSize)
    val savoLabelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK
        textAlign = Paint.Align.CENTER
        isFakeBoldText = true
        textSize = 28f
        letterSpacing = 0.18f
        typeface = Typeface.create("sans-serif", Typeface.BOLD)
    }
    canvas.drawText("SAVO", tileLeft + tileSize / 2f, tileTop + tileSize + 44f, savoLabelPaint)

    y = rowBottom + 16f

    // ── Divider ─────────────────────────────────────────────────────────────
    val dividerPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = DIVIDER
        strokeWidth = 1.5f
    }
    canvas.drawLine(pad, y, CARD_W - pad, y, dividerPaint)
    y += 36f

    // ── TAP TO CALL label ──────────────────────────────────────────────────
    val tapLabel = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = MUTED
        textAlign = Paint.Align.CENTER
        textSize = 22f
        letterSpacing = 0.22f
        isFakeBoldText = true
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    }
    canvas.drawText("TAP TO CALL", CARD_W / 2f, y, tapLabel)
    y += 30f

    // ── Three call buttons ─────────────────────────────────────────────────
    val btnR = 48f
    val cellW = (CARD_W - pad * 2) / 3f
    val centersY = y + btnR + 8f
    val labels = listOf("Roadside", "Tow Truck", "Emergency")
    val drawers: List<(Canvas, Float, Float) -> Unit> = listOf(
        ::drawRoadsideIcon,
        ::drawTowTruckIcon,
        ::drawEmergencyIcon,
    )
    val pillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = PILL_BG; style = Paint.Style.FILL }
    val itemLabel = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = MUTED
        textAlign = Paint.Align.CENTER
        textSize = 22f
        typeface = Typeface.create("sans-serif", Typeface.NORMAL)
    }
    for (i in 0..2) {
        val cx = pad + cellW * i + cellW / 2f
        canvas.drawCircle(cx, centersY, btnR, pillPaint)
        drawers[i](canvas, cx, centersY)
        canvas.drawText(labels[i], cx, centersY + btnR + 38f, itemLabel)
    }

    return bmp
}

private fun formatRego(rego: String): String {
    val r = rego.trim().uppercase()
    if (r.isBlank()) return "—"
    // Insert a space between the letter group and the digit group, NZI style.
    val m = Regex("^([A-Z]+)([0-9].*)$").find(r)
    return if (m != null) "${m.groupValues[1]} ${m.groupValues[2]}" else r
}

private fun drawRings(
    canvas: Canvas,
    cx: Float,
    cy: Float,
    outerR: Float,
    stroke: Float,
    insDays: Int?,
    wofDays: Int?,
    regoDays: Int?,
) {
    data class Ring(val days: Int?, val baseColor: Int, val radius: Float)
    val gap = stroke + 8f
    val rings = listOf(
        Ring(insDays, GREEN, outerR),
        Ring(wofDays, AMBER, outerR - gap),
        Ring(regoDays, BLUE, outerR - gap * 2),
    )
    val track = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = TRACK
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
    }
    val arc = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = stroke
        strokeCap = Paint.Cap.ROUND
    }
    for (r in rings) {
        if (r.radius < stroke) continue
        val rect = RectF(cx - r.radius, cy - r.radius, cx + r.radius, cy + r.radius)
        canvas.drawArc(rect, 0f, 360f, false, track)
        val d = r.days
        val fraction = when {
            d == null -> 0f
            d <= 0 -> 0f
            else -> (d.toFloat() / 365f).coerceIn(0f, 1f)
        }
        val color = when {
            d == null -> 0xFFB8BCC4.toInt()
            d < 7 -> 0xFFDC2626.toInt()
            d < 30 -> 0xFFF59E0B.toInt()
            else -> r.baseColor
        }
        if (fraction > 0f) {
            arc.color = color
            canvas.drawArc(rect, -90f, 360f * fraction, false, arc)
        }
    }
}

private fun drawSavoTile(canvas: Canvas, left: Float, top: Float, size: Float) {
    val tile = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE }
    val rect = RectF(left, top, left + size, top + size)
    canvas.drawRoundRect(rect, 28f, 28f, tile)

    // Camera-shutter mark in the center
    val cx = left + size / 2f
    val cy = top + size / 2f
    val ringR = size * 0.28f
    val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = size * 0.05f
    }
    canvas.drawCircle(cx, cy, ringR, ringPaint)
    val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.WHITE; style = Paint.Style.FILL }
    canvas.drawCircle(cx, cy, size * 0.07f, dotPaint)
}

// ─── Tiny vector icons drawn directly onto the canvas ────────────────────────
private fun drawRoadsideIcon(canvas: Canvas, cx: Float, cy: Float) {
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK; style = Paint.Style.STROKE; strokeWidth = 3.5f; strokeCap = Paint.Cap.ROUND
    }
    val orange = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.FILL }
    // car body
    val body = RectF(cx - 28f, cy - 4f, cx + 28f, cy + 14f)
    canvas.drawRoundRect(body, 6f, 6f, stroke)
    // roof
    val roof = Path().apply {
        moveTo(cx - 18f, cy - 4f); lineTo(cx - 12f, cy - 16f)
        lineTo(cx + 12f, cy - 16f); lineTo(cx + 18f, cy - 4f); close()
    }
    canvas.drawPath(roof, stroke)
    // wheels
    canvas.drawCircle(cx - 16f, cy + 16f, 4f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK })
    canvas.drawCircle(cx + 16f, cy + 16f, 4f, Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK })
    // light bar (orange triangle on roof)
    val light = Path().apply {
        moveTo(cx - 5f, cy - 16f); lineTo(cx, cy - 24f); lineTo(cx + 5f, cy - 16f); close()
    }
    canvas.drawPath(light, orange)
}

private fun drawTowTruckIcon(canvas: Canvas, cx: Float, cy: Float) {
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK; style = Paint.Style.STROKE; strokeWidth = 3.5f; strokeCap = Paint.Cap.ROUND
    }
    val orange = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.FILL }
    // cab
    val cab = RectF(cx - 26f, cy - 2f, cx - 6f, cy + 14f)
    canvas.drawRoundRect(cab, 4f, 4f, stroke)
    // bed
    val bed = RectF(cx - 6f, cy + 4f, cx + 26f, cy + 14f)
    canvas.drawRoundRect(bed, 3f, 3f, stroke)
    // boom (diagonal line)
    canvas.drawLine(cx + 20f, cy + 4f, cx - 8f, cy - 18f, stroke)
    // flag at boom tip
    val flag = Path().apply {
        moveTo(cx - 8f, cy - 18f); lineTo(cx - 22f, cy - 14f); lineTo(cx - 8f, cy - 10f); close()
    }
    canvas.drawPath(flag, orange)
    // wheels
    val wheels = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK }
    canvas.drawCircle(cx - 18f, cy + 16f, 4f, wheels)
    canvas.drawCircle(cx + 6f, cy + 16f, 4f, wheels)
    canvas.drawCircle(cx + 18f, cy + 16f, 4f, wheels)
}

private fun drawEmergencyIcon(canvas: Canvas, cx: Float, cy: Float) {
    val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = INK; style = Paint.Style.STROKE; strokeWidth = 3.5f; strokeCap = Paint.Cap.ROUND
    }
    val orange = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.FILL }
    // van body
    val body = RectF(cx - 26f, cy - 10f, cx + 22f, cy + 14f)
    canvas.drawRoundRect(body, 5f, 5f, stroke)
    // window
    canvas.drawLine(cx + 6f, cy - 10f, cx + 6f, cy + 4f, stroke)
    // wheels
    val wheels = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = INK }
    canvas.drawCircle(cx - 16f, cy + 16f, 4f, wheels)
    canvas.drawCircle(cx + 14f, cy + 16f, 4f, wheels)
    // orange + cross
    val crossPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = ORANGE; style = Paint.Style.STROKE; strokeWidth = 3f; strokeCap = Paint.Cap.ROUND }
    canvas.drawLine(cx - 8f, cy - 4f, cx - 8f, cy + 8f, crossPaint)
    canvas.drawLine(cx - 14f, cy + 2f, cx - 2f, cy + 2f, crossPaint)
    // small light
    canvas.drawCircle(cx + 18f, cy - 12f, 3f, orange)
}

// =============================================================================
// Backend refresh (unchanged)
// =============================================================================

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
                    val rs = v.optString("roadsidePhone", "")
                    if (rs.isNotBlank()) editor.putString("vehicle_${total}_roadside_phone", rs)
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
