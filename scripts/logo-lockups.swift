import Foundation
import AppKit
import CoreText

guard CommandLine.arguments.count == 2 else { fatalError("Usage: logo-lockups.swift kit-directory") }
let folder = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let fontURL = folder.appendingPathComponent("Comfortaa.ttf")
let headURL = folder.appendingPathComponent("02-logo-head.png")
guard let head = NSImage(contentsOf: headURL), head.size.width > 0, head.size.height > 0 else { fatalError("Expected valid 02-logo-head.png in kit") }
var registrationError: Unmanaged<CFError>?
guard CTFontManagerRegisterFontsForURL(fontURL as CFURL, .process, &registrationError) else { fatalError("Cannot register Comfortaa.ttf: \(String(describing: registrationError?.takeRetainedValue()))") }
guard let provider = CGDataProvider(url: fontURL as CFURL), let graphicsFont = CGFont(provider), let postscriptName = graphicsFont.postScriptName else { fatalError("Cannot load font data") }
let weightAxis = NSNumber(value: UInt32(0x77676874))
func typeface(_ size: CGFloat) -> CTFont {
    let attributes: [CFString: Any] = [kCTFontNameAttribute: postscriptName, kCTFontVariationAttribute: [weightAxis: 700]]
    let font = CTFontCreateWithFontDescriptor(CTFontDescriptorCreateWithAttributes(attributes as CFDictionary), size, nil)
    guard (CTFontCopyFamilyName(font) as String).lowercased().contains("comfortaa") else { fatalError("Font substitution detected") }
    return font
}
func ink(_ hex: UInt32) -> CGColor { CGColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1) }
let blue = ink(0x3f70f7), navy = ink(0x14233d), white = ink(0xffffff)
func line(_ string: String, font: CTFont, color: CGColor) -> CTLine {
    let attributes: [NSAttributedString.Key: Any] = [NSAttributedString.Key(kCTFontAttributeName as String): font, NSAttributedString.Key(kCTForegroundColorAttributeName as String): color]
    return CTLineCreateWithAttributedString(NSAttributedString(string: string, attributes: attributes))
}
func drawWordmark(_ context: CGContext, center: CGPoint, size: CGFloat, whiteVersion: Bool) {
    let font = typeface(size)
    let first = line("jaz", font: font, color: whiteVersion ? white : blue)
    let last = line("!", font: font, color: whiteVersion ? white : navy)
    var ascent: CGFloat = 0, descent: CGFloat = 0, leading: CGFloat = 0
    let firstWidth = CGFloat(CTLineGetTypographicBounds(first, &ascent, &descent, &leading))
    let lastWidth = CGFloat(CTLineGetTypographicBounds(last, nil, nil, nil))
    let x = center.x - (firstWidth + lastWidth) / 2
    let y = center.y - (ascent - descent) / 2
    context.textMatrix = .identity
    context.textPosition = CGPoint(x: x, y: y); CTLineDraw(first, context)
    context.textPosition = CGPoint(x: x + firstWidth, y: y); CTLineDraw(last, context)
}
func contained(_ image: NSImage, in area: NSRect) -> NSRect {
    let scale = min(area.width / image.size.width, area.height / image.size.height)
    let size = NSSize(width: image.size.width * scale, height: image.size.height * scale)
    return NSRect(x: area.midX - size.width / 2, y: area.midY - size.height / 2, width: size.width, height: size.height)
}
func exportLogo(name: String, width: Int, height: Int, stacked: Bool, whiteVersion: Bool) throws {
    guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0), let graphics = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Cannot allocate logo canvas") }
    NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = graphics
    let context = graphics.cgContext
    context.clear(CGRect(x: 0, y: 0, width: width, height: height))
    let imageArea: NSRect = stacked ? NSRect(x: 80, y: 230, width: 440, height: 390) : NSRect(x: 25, y: 20, width: 290, height: 280)
    head.draw(in: contained(head, in: imageArea), from: .zero, operation: .sourceOver, fraction: 1)
    drawWordmark(context, center: stacked ? CGPoint(x: 300, y: 115) : CGPoint(x: 635, y: 160), size: stacked ? 175 : 190, whiteVersion: whiteVersion)
    NSGraphicsContext.restoreGraphicsState()
    guard let data = bitmap.representation(using: .png, properties: [:]) else { fatalError("PNG encoding failed") }
    try data.write(to: folder.appendingPathComponent(name))
    print("Logo \(name): \(width)×\(height), alpha=true")
}
try exportLogo(name: "logo-horizontal.png", width: 1000, height: 320, stacked: false, whiteVersion: false)
try exportLogo(name: "logo-stacked.png", width: 600, height: 640, stacked: true, whiteVersion: false)
try exportLogo(name: "logo-white.png", width: 1000, height: 320, stacked: false, whiteVersion: true)

// A separate labelled overview keeps the 12-pose contact sheet semantically clear.
let sheetWidth = 1800, sheetHeight = 780
guard let sheet = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: sheetWidth, pixelsHigh: sheetHeight, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0), let sheetContext = NSGraphicsContext(bitmapImageRep: sheet) else { fatalError("Cannot allocate logo sheet") }
NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = sheetContext
let context = sheetContext.cgContext
context.setFillColor(ink(0xf4f8ff)); context.fill(CGRect(x: 0, y: 0, width: sheetWidth, height: sheetHeight))
let titleAttrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 36, weight: .bold), .foregroundColor: NSColor(cgColor: navy)!]
NSString(string: "Jaz! · 3 готовых логотипа").draw(at: CGPoint(x: 48, y: 700), withAttributes: titleAttrs)
for (index, file) in ["logo-horizontal.png", "logo-stacked.png", "logo-white.png"].enumerated() {
    let x = 48 + CGFloat(index) * 584
    let rect = NSRect(x: x, y: 65, width: 536, height: 590)
    (index == 2 ? NSColor(cgColor: blue)! : .white).setFill(); NSBezierPath(roundedRect: rect, xRadius: 26, yRadius: 26).fill()
    guard let logo = NSImage(contentsOf: folder.appendingPathComponent(file)) else { fatalError("Missing generated logo") }
    let area = NSRect(x: x + 28, y: 190, width: 480, height: 390)
    logo.draw(in: contained(logo, in: area), from: .zero, operation: .sourceOver, fraction: 1)
    let labels = ["Горизонтальный", "Вертикальный", "Белый на синем"]
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: 22, weight: .semibold), .foregroundColor: index == 2 ? NSColor.white : NSColor(cgColor: navy)!]
    NSString(string: labels[index]).draw(at: CGPoint(x: x + 28, y: 130), withAttributes: attrs)
    NSString(string: file).draw(at: CGPoint(x: x + 28, y: 95), withAttributes: [.font: NSFont.systemFont(ofSize: 14), .foregroundColor: index == 2 ? NSColor.white.withAlphaComponent(0.8) : NSColor(cgColor: navy)!.withAlphaComponent(0.65)])
}
NSGraphicsContext.restoreGraphicsState()
guard let sheetData = sheet.representation(using: .jpeg, properties: [.compressionFactor: 0.93]) else { fatalError("Cannot encode logo sheet") }
try sheetData.write(to: folder.appendingPathComponent("logo-sheet.jpg"))
let proof = typeface(190)
print("Wordmark font: \(CTFontCopyPostScriptName(proof)); family=\(CTFontCopyFamilyName(proof)); variation=\(String(describing: CTFontCopyVariation(proof))); logo-sheet=1800×780")
