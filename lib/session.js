import fs from "fs"
import path from "path"

// Encode session folder to base64 string
export function encodeSession(sessionDir = "./session") {
  const files = fs.readdirSync(sessionDir)
  const data = {}

  for (const file of files) {
    const filePath = path.join(sessionDir, file)
    data[file] = fs.readFileSync(filePath, "utf8")
  }

  return Buffer.from(JSON.stringify(data)).toString("base64")
}

// Decode base64 session string back into session folder
export function decodeSession(sessionString, sessionDir = "./session") {
  const data = JSON.parse(Buffer.from(sessionString, "base64").toString("utf8"))
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

  for (const [file, content] of Object.entries(data)) {
    fs.writeFileSync(path.join(sessionDir, file), content, "utf8")
  }

  return true
}
