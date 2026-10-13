import UIKit
import SafariServices
import Network

/// Installable iOS container. Live product screens remain served by the existing site.
/// Safari is presented as a modal, never embedded as a child controller.
final class HomeViewController: UIViewController, SFSafariViewControllerDelegate {
    var destination = SiteConfiguration.home
    private let network = NWPathMonitor()
    private let status = UILabel()
    private let enterButton = UIButton(type: .system)
    private var browser: SFSafariViewController?
    private var didOpenOnLaunch = false
    private var isOnline = true

    private let green = UIColor(red: 49/255, green: 88/255, blue: 75/255, alpha: 1)
    private let orange = UIColor(red: 223/255, green: 104/255, blue: 76/255, alpha: 1)
    private let cream = UIColor(red: 247/255, green: 246/255, blue: 242/255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = cream
        makeHome()
        network.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                guard let self else { return }
                self.isOnline = path.status == .satisfied
                self.status.text = self.isOnline
                    ? "首次进入，请登录网站账号并输入 16 位 Token。"
                    : "当前没有网络连接。恢复网络后，点击进入同频。"
            }
        }
        network.start(queue: DispatchQueue(label: "hk.tongpin.network"))
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !didOpenOnLaunch else { return }
        didOpenOnLaunch = true
        if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil { return }
        open(destination, animated: false)
    }

    private func makeHome() {
        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)
        NSLayoutConstraint.activate([
            scroll.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)
        ])

        let logo = UIImageView(image: UIImage(named: "BrandMark"))
        logo.contentMode = .scaleAspectFit
        logo.accessibilityLabel = "同频"
        logo.isAccessibilityElement = true
        logo.heightAnchor.constraint(equalToConstant: 80).isActive = true

        let name = label("同频", size: 21, weight: .semibold)
        let headline = label("相遇，由你。", size: 34, weight: .semibold)
        let subtitle = label("香港 · 成年人的轻约会空间", size: 14)
        let description = label("继续你的聊天、附近探索与专属推荐。", size: 13)
        subtitle.textColor = .secondaryLabel
        description.textColor = .secondaryLabel
        enterButton.configuration = .filled()
        enterButton.configuration?.title = "进入同频"
        enterButton.configuration?.baseBackgroundColor = orange
        enterButton.configuration?.baseForegroundColor = .white
        enterButton.configuration?.cornerStyle = .large
        enterButton.configuration?.contentInsets = NSDirectionalEdgeInsets(top: 17, leading: 20, bottom: 17, trailing: 20)
        enterButton.addTarget(self, action: #selector(enter), for: .touchUpInside)
        enterButton.accessibilityIdentifier = "enter-tongpin"
        status.font = .preferredFont(forTextStyle: .footnote)
        status.adjustsFontForContentSizeCategory = true
        status.numberOfLines = 0
        status.textAlignment = .center
        status.textColor = .secondaryLabel
        status.text = "首次进入，请登录网站账号并输入 16 位 Token。"
        let footer = label("18+ · 尊重彼此，坦诚相遇", size: 11)
        footer.textColor = .tertiaryLabel
        let content = UIView()
        content.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(content)
        let minimumHeight = content.heightAnchor.constraint(equalTo: scroll.frameLayoutGuide.heightAnchor)
        minimumHeight.priority = .defaultLow
        NSLayoutConstraint.activate([
            content.leadingAnchor.constraint(equalTo: scroll.contentLayoutGuide.leadingAnchor),
            content.trailingAnchor.constraint(equalTo: scroll.contentLayoutGuide.trailingAnchor),
            content.topAnchor.constraint(equalTo: scroll.contentLayoutGuide.topAnchor),
            content.bottomAnchor.constraint(equalTo: scroll.contentLayoutGuide.bottomAnchor),
            content.widthAnchor.constraint(equalTo: scroll.frameLayoutGuide.widthAnchor),
            content.heightAnchor.constraint(greaterThanOrEqualTo: scroll.frameLayoutGuide.heightAnchor),
            minimumHeight
        ])
        let stack = UIStackView(arrangedSubviews: [logo, name, headline, subtitle, description, enterButton, status, footer])
        stack.axis = .vertical
        stack.spacing = 19
        stack.setCustomSpacing(28, after: logo)
        stack.setCustomSpacing(27, after: description)
        stack.setCustomSpacing(32, after: status)
        stack.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 28),
            stack.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -28),
            stack.topAnchor.constraint(greaterThanOrEqualTo: content.topAnchor, constant: 30),
            stack.bottomAnchor.constraint(lessThanOrEqualTo: content.bottomAnchor, constant: -30),
            stack.centerYAnchor.constraint(equalTo: content.centerYAnchor)
        ])
    }

    private func label(_ text: String, size: CGFloat, weight: UIFont.Weight = .regular) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = UIFontMetrics.default.scaledFont(for: .systemFont(ofSize: size, weight: weight))
        label.adjustsFontForContentSizeCategory = true
        label.textColor = green
        label.numberOfLines = 0
        label.textAlignment = .center
        return label
    }

    @objc private func enter() { open(destination) }

    func open(_ destination: URL, animated: Bool = true) {
        guard destination.scheme == SiteConfiguration.home.scheme,
              destination.host == SiteConfiguration.home.host,
              destination.port == nil, destination.user == nil, destination.password == nil else { return }
        self.destination = destination
        guard isOnline else {
            status.text = "当前没有网络连接。恢复网络后，点击进入同频。"
            return
        }
        if let browser {
            browser.dismiss(animated: false) { [weak self] in
                self?.browser = nil
                self?.presentSite(destination, animated: animated)
            }
        } else if presentedViewController == nil {
            presentSite(destination, animated: animated)
        }
    }

    private func presentSite(_ url: URL, animated: Bool) {
        let configuration = SFSafariViewController.Configuration()
        configuration.entersReaderIfAvailable = false
        configuration.barCollapsingEnabled = true
        let controller = SFSafariViewController(url: url, configuration: configuration)
        controller.preferredBarTintColor = cream
        controller.preferredControlTintColor = green
        controller.dismissButtonStyle = .close
        controller.modalPresentationStyle = .fullScreen
        controller.delegate = self
        controller.overrideUserInterfaceStyle = .light
        browser = controller
        present(controller, animated: animated)
    }

    func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
        browser = nil
    }

    func safariViewController(_ controller: SFSafariViewController, didCompleteInitialLoad didLoadSuccessfully: Bool) {
        if !didLoadSuccessfully {
            status.text = "网站加载未完成，关闭页面后可再次点击进入同频。"
        }
    }

    deinit { network.cancel() }
}
