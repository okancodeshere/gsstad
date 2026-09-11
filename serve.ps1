using namespace System.Net
using namespace System.IO

$port = 8080
$path = "D:\yedek programlar\agentprojerleri\stad"
$listener = [HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Listening on http://localhost:$port/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $response = $context.Response
    
    $requestPath = $context.Request.Url.LocalPath
    if ($requestPath -eq "/") { $requestPath = "/index.html" }
    
    $filePath = Join-Path $path $requestPath.TrimStart('/')
    
    if (Test-Path $filePath -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        if ($ext -eq '.html') { $response.ContentType = "text/html" }
        elseif ($ext -eq '.js') { $response.ContentType = "application/javascript" }
        elseif ($ext -eq '.css') { $response.ContentType = "text/css" }
        elseif ($ext -eq '.json') { $response.ContentType = "application/json" }
        
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentLength64 = $bytes.Length
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
