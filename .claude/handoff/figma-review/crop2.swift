import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let sw = Int(a[3])!, sh = Int(a[4])!
var r = 0, y = 0
while y < img.height {
  var c = 0, x = 0
  while x < img.width {
    let piece = img.cropping(to: CGRect(x: x, y: y, width: min(sw, img.width-x), height: min(sh, img.height-y)))!
    let dst = CGImageDestinationCreateWithURL(URL(fileURLWithPath: "\(a[2])r\(r)c\(c).png") as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dst, piece, nil); CGImageDestinationFinalize(dst)
    c += 1; x += sw
  }
  r += 1; y += sh
}
print(r)
