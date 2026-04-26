//
//  SavoWidget.swift
//  Savo home-screen widget for iOS (WidgetKit + SwiftUI).
//
//  ⚠️  This file is a SCAFFOLD. To activate it:
//   1. From the project root run:  npx cap add ios
//   2. Open  ios/App/App.xcworkspace  in Xcode.
//   3. File → New → Target → "Widget Extension"  named  "SavoWidget".
//      Uncheck "Include Configuration Intent". Bundle ID:  nz.co.savo.app.SavoWidget
//   4. Replace the generated SavoWidget.swift with the contents of this file.
//   5. Add an App Group to BOTH the main app target and the widget target:
//        Capabilities → App Groups → +  group.nz.co.savo.app
//   6. Add a URL Type to the main app: identifier  nz.co.savo.app  scheme  savo
//   7. Build & run on a device. Long-press home screen → + → search "SAVO".
//
//  Token sharing: the React app writes the widget token into the App Group
//  UserDefaults (suite "group.nz.co.savo.app") via a small Capacitor plugin
//  that you'll wire up after `cap add ios` (see ios-widget-bridge.swift in
//  the same folder).
//

import WidgetKit
import SwiftUI

struct SavoEntry: TimelineEntry {
    let date: Date
    let claimRef: String
    let claimStatus: String
    let expiryLine: String
    let insurerName: String
    let insurerPhone: String
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SavoEntry {
        SavoEntry(date: .now, claimRef: "", claimStatus: "Loading…", expiryLine: "", insurerName: "Insurer", insurerPhone: "")
    }

    func getSnapshot(in context: Context, completion: @escaping (SavoEntry) -> ()) {
        completion(loadCached())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SavoEntry>) -> ()) {
        Task {
            await refreshFromBackend()
            let entry = loadCached()
            let next = Date().addingTimeInterval(30 * 60)
            completion(Timeline(entries: [entry], policy: .after(next)))
        }
    }

    private func defaults() -> UserDefaults? {
        UserDefaults(suiteName: "group.nz.co.savo.app")
    }

    private func loadCached() -> SavoEntry {
        let d = defaults()
        return SavoEntry(
            date: .now,
            claimRef: d?.string(forKey: "claim_ref") ?? "",
            claimStatus: d?.string(forKey: "claim_status") ?? "No active claim",
            expiryLine: d?.string(forKey: "expiry_line") ?? "No upcoming expiries",
            insurerName: d?.string(forKey: "insurer_name") ?? "Insurer",
            insurerPhone: d?.string(forKey: "insurer_phone") ?? ""
        )
    }

    private func refreshFromBackend() async {
        guard let d = defaults(),
              let token = d.string(forKey: "widget_token"),
              let baseUrl = d.string(forKey: "supabase_url"),
              let url = URL(string: "\(baseUrl)/functions/v1/widget-data") else { return }

        var req = URLRequest(url: url)
        req.setValue(token, forHTTPHeaderField: "X-Widget-Token")
        if let anon = d.string(forKey: "supabase_anon") { req.setValue(anon, forHTTPHeaderField: "apikey") }
        req.timeoutInterval = 8

        do {
            let (data, _) = try await URLSession.shared.data(for: req)
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }

            if let claim = json["claim"] as? [String: Any] {
                d.set(claim["reportNumber"] as? String ?? "", forKey: "claim_ref")
                d.set(claim["status"] as? String ?? "draft", forKey: "claim_status")
            } else {
                d.set("", forKey: "claim_ref")
                d.set("No active claim", forKey: "claim_status")
            }

            if let e = json["nextExpiry"] as? [String: Any] {
                let kind = e["kind"] as? String ?? ""
                let date = e["date"] as? String ?? ""
                let rego = e["rego"] as? String ?? ""
                d.set("\(kind) · \(date)\(rego.isEmpty ? "" : " · \(rego)")", forKey: "expiry_line")
            } else {
                d.set("No upcoming expiries", forKey: "expiry_line")
            }

            if let contacts = json["contacts"] as? [String: Any],
               let insurer = contacts["insurer"] as? [String: Any] {
                d.set(insurer["name"] as? String ?? "Insurer", forKey: "insurer_name")
                d.set(insurer["phone"] as? String ?? "", forKey: "insurer_phone")
            }
        } catch { /* network fail = keep cached */ }
    }
}

struct SavoWidgetEntryView: View {
    var entry: SavoEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("SAVO").font(.system(size: 11, weight: .bold)).foregroundColor(Color(red: 0.95, green: 0.42, blue: 0.12))
            Text(entry.claimRef.isEmpty ? "Latest claim" : "Claim \(entry.claimRef)")
                .font(.system(size: 13, weight: .semibold)).foregroundColor(.white)
            Text(entry.claimStatus).font(.system(size: 11)).foregroundColor(.gray)
            Spacer(minLength: 4)
            Text(entry.expiryLine).font(.system(size: 11)).foregroundColor(.white).lineLimit(1)
            Spacer(minLength: 6)
            HStack(spacing: 6) {
                Link(destination: URL(string: "savo://quick-capture")!) {
                    actionPill("Capture", bg: Color(red: 0.95, green: 0.42, blue: 0.12))
                }
                if !entry.insurerPhone.isEmpty {
                    Link(destination: URL(string: "tel:\(entry.insurerPhone)")!) {
                        actionPill(String(entry.insurerName.prefix(8)), bg: Color(red: 0.12, green: 0.16, blue: 0.24))
                    }
                }
                Link(destination: URL(string: "tel:111")!) {
                    actionPill("111", bg: Color(red: 0.73, green: 0.11, blue: 0.11))
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .background(Color(red: 0.06, green: 0.09, blue: 0.16))
    }

    @ViewBuilder
    private func actionPill(_ label: String, bg: Color) -> some View {
        Text(label).font(.system(size: 11, weight: .bold)).foregroundColor(.white)
            .frame(maxWidth: .infinity, minHeight: 32).background(bg).cornerRadius(10)
    }
}

@main
struct SavoWidget: Widget {
    let kind: String = "SavoWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            SavoWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("SAVO")
        .description("Latest claim, next expiry and quick incident capture.")
        .supportedFamilies([.systemMedium])
    }
}
