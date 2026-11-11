import Foundation
import AppKit

struct Item: Decodable { let id: String; let file: String; let title: String; let usage: String; let animation: String }
struct Manifest: Decodable { let title: String; let items: [Item] }
guard CommandLine.arguments.count == 2 else { fatalError("Usage: contact-sheet.swift kit-directory") }
let folder = URL(fileURLWithPath: CommandLine.arguments[1], isDirectory: true)
let manifest = try JSONDecoder().decode(Manifest.self, from: Data(contentsOf: folder.appendingPathComponent("manifest.json")))
guard !manifest.items.isEmpty else { fatalError("Manifest has no items") }
let columns = 4
let rows = Int(ceil(Double(manifest.items.count) / Double(columns)))
let width: CGFloat = 1920
let margin: CGFloat = 52
let gap: CGFloat = 24
let header: CGFloat = 160
let cellWidth = (width - margin * 2 - gap * CGFloat(columns - 1)) / CGFloat(columns)
let cellHeight: CGFloat = 470
let height = header + CGFloat(rows) * cellHeight + CGFloat(rows - 1) * gap + margin
guard let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: Int(width), pixelsHigh: Int(height), bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0), let context = NSGraphicsContext(bitmapImageRep: bitmap) else { fatalError("Cannot create output canvas") }
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
let cg = context.cgContext
cg.translateBy(x: 0, y: height)
cg.scaleBy(x: 1, y: -1)

func color(_ hex: UInt32) -> NSColor { NSColor(srgbRed: CGFloat((hex >> 16) & 255) / 255, green: CGFloat((hex >> 8) & 255) / 255, blue: CGFloat(hex & 255) / 255, alpha: 1) }
func text(_ string: String, x: CGFloat, y: CGFloat, w: CGFloat, h: CGFloat, size: CGFloat, bold: Bool = false, ink: NSColor = color(0x14233d)) {
    let style = NSMutableParagraphStyle(); style.lineBreakMode = .byWordWrapping
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size, weight: bold ? .bold : .regular), .foregroundColor: ink, .paragraphStyle: style]
    // AppKit text expects upright coordinates; draw in a local flipped context.
    NSGraphicsContext.saveGraphicsState()
    cg.translateBy(x: x, y: y + h); cg.scaleBy(x: 1, y: -1)
    NSString(string: string).draw(with: NSRect(x: 0, y: 0, width: w, height: h), options: [.usesLineFragmentOrigin, .usesFontLeading], attributes: attrs)
    NSGraphicsContext.restoreGraphicsState()
}
color(0xf4f8ff).setFill(); NSBezierPath(rect: NSRect(x: 0, y: 0, width: width, height: height)).fill()
text(manifest.title, x: margin, y: 38, w: width - margin * 2, h: 56, size: 39, bold: true)
text("Jaz! · Барыс в тақия · \(manifest.items.count) согласованных вариантов", x: margin, y: 96, w: width - margin * 2, h: 30, size: 19, ink: color(0x6b83a6))

for (index, item) in manifest.items.enumerated() {
    let x = margin + CGFloat(index % columns) * (cellWidth + gap)
    let y = header + CGFloat(index / columns) * (cellHeight + gap)
    let rect = NSRect(x: x, y: y, width: cellWidth, height: cellHeight)
    NSColor.white.setFill(); NSBezierPath(roundedRect: rect, xRadius: 24, yRadius: 24).fill()
    guard let image = NSImage(contentsOf: folder.appendingPathComponent(item.file)), image.size.width > 0, image.size.height > 0 else { fatalError("Cannot load image \(item.file)") }
    let imageArea = NSRect(x: x + 32, y: y + 25, width: cellWidth - 64, height: 280)
    let scale = min(imageArea.width / image.size.width, imageArea.height / image.size.height)
    let drawn = NSSize(width: image.size.width * scale, height: image.size.height * scale)
    let imageRect = NSRect(x: imageArea.midX - drawn.width / 2, y: imageArea.midY - drawn.height / 2, width: drawn.width, height: drawn.height)
    // Flip the image locally so it remains upright on the top-down page.
    NSGraphicsContext.saveGraphicsState()
    cg.translateBy(x: imageRect.minX, y: imageRect.maxY); cg.scaleBy(x: 1, y: -1)
    image.draw(in: NSRect(origin: .zero, size: imageRect.size), from: .zero, operation: .sourceOver, fraction: 1)
    NSGraphicsContext.restoreGraphicsState()
    text(String(format: "%02d", index + 1), x: x + 25, y: y + 320, w: 38, h: 24, size: 14, bold: true, ink: color(0x6d8bb7))
    text(item.title, x: x + 25, y: y + 350, w: cellWidth - 50, h: 48, size: 21, bold: true)
    text(item.usage, x: x + 25, y: y + 408, w: cellWidth - 50, h: 40, size: 15, ink: color(0x6981a5))
}
NSGraphicsContext.restoreGraphicsState()
guard let jpg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.92]) else { fatalError("Cannot encode JPEG") }
let output = folder.appendingPathComponent("contact-sheet.jpg")
try jpg.write(to: output)
print("Contact sheet: \(Int(width))×\(Int(height)) -> \(output.path)")
