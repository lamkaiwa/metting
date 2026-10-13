import Foundation

enum SiteConfiguration {
    static let home = URL(string: "https://tongpin-hk.jovial-knoll-4654.chatgpt.site/")!

    // Only this app's invite scheme is accepted. The destination cannot be overridden by an incoming URL.
    static func destination(for incoming: URL) -> URL? {
        guard incoming.scheme?.lowercased() == "tongpin",
              incoming.user == nil, incoming.password == nil, incoming.port == nil else { return nil }
        if incoming.host == "open", incoming.path.isEmpty,
           incoming.query == nil, incoming.fragment == nil { return home }
        guard incoming.host == "invite", incoming.query == nil, incoming.fragment == nil else { return nil }
        let token = String(incoming.path.dropFirst())
        guard token.count == 16, token.allSatisfy({ character in
            character.isASCII && (character.isLetter || character.isNumber)
        }) else { return nil }
        var destination = URLComponents(url: home, resolvingAgainstBaseURL: false)!
        destination.fragment = "invite=" + token
        return destination.url
    }
}
