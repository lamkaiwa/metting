import XCTest
@testable import Tongpin

final class SiteConfigurationTests: XCTestCase {
    func testValidInviteStaysOnConfiguredOrigin() throws {
        let incoming = try XCTUnwrap(URL(string: "tongpin://invite/AbCdEf0123456789"))
        let destination = try XCTUnwrap(SiteConfiguration.destination(for: incoming))
        XCTAssertEqual(destination.scheme, "https")
        XCTAssertEqual(destination.host, SiteConfiguration.home.host)
        XCTAssertEqual(destination.path, "/")
        XCTAssertEqual(destination.fragment, "invite=AbCdEf0123456789")
        XCTAssertNil(destination.query)
    }

    func testExplicitOpen() throws {
        XCTAssertEqual(SiteConfiguration.destination(for: try XCTUnwrap(URL(string: "tongpin://open"))), SiteConfiguration.home)
    }

    func testRejectsExternalDestinationsAndMalformedTokens() throws {
        let rejected = [
            "https://evil.example/",
            "tongpin://evil.example/AbCdEf0123456789",
            "tongpin://invite/short",
            "tongpin://invite/AbCdEf01234567890",
            "tongpin://invite/AbCdEf0123456789?next=https://evil.example",
            "tongpin://invite/AbCdEf0123456789#next",
            "tongpin://invite/AbCdEf012345678/",
            "tongpin://user:password@invite/AbCdEf0123456789",
            "tongpin://invite:443/AbCdEf0123456789",
            "tongpin://open?next=https://evil.example",
            "tongpin://invite/ＡbCdEf0123456789"
        ]
        for address in rejected {
            let incoming = try XCTUnwrap(URL(string: address))
            XCTAssertNil(SiteConfiguration.destination(for: incoming), address)
        }
    }
}
