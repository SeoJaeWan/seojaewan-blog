import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
let src = CGImageSourceCreateWithURL(URL(fileURLWithPath: a[1]) as CFURL, nil)!
let img = CGImageSourceCreateImageAtIndex(src, 0, nil)!
let step = Int(a[3])!
var i = 0
var y = 0
while y < img.height {
  let h = min(step, img.height - y)
  let c = img.cropping(to: CGRect(x: 0, y: y, width: img.width, height: h))!
  let out = URL(fileURLWithPath: "\(a[2])\(i).png")
  let dst = CGImageDestinationCreateWithURL(out as CFURL, UTType.png.identifier as CFString, 1, nil)!
  CGImageDestinationAddImage(dst, c, nil)
  CGImageDestinationFinalize(dst)
  i += 1; y += step
}
print(i)
