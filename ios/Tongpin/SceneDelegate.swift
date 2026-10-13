import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private weak var home: HomeViewController?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession,
               options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let controller = HomeViewController()
        if let incoming = connectionOptions.urlContexts.first?.url,
           let destination = SiteConfiguration.destination(for: incoming) {
            controller.destination = destination
        }
        let window = UIWindow(windowScene: windowScene)
        window.rootViewController = controller
        self.window = window
        self.home = controller
        window.makeKeyAndVisible()
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let incoming = URLContexts.first?.url,
              let destination = SiteConfiguration.destination(for: incoming) else { return }
        home?.open(destination)
    }
}
