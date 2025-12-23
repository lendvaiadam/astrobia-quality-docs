$port = 8081
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:${port}/")
$listener.Start()

Write-Host "Listening on http://localhost:${port}/"
Write-Host "Press Ctrl+C to stop."

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath
    $filePath = Join-Path (Get-Location) $path.Substring(1)

    if (Test-Path $filePath -PathType Container) {
        $filePath = Join-Path $filePath "index.html"
    }

    if (Test-Path $filePath -PathType Leaf) {
        try {
            $content = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $content.Length
            
            $extension = [System.IO.Path]::GetExtension($filePath)
            switch ($extension) {
                ".html" { $response.ContentType = "text/html" }
                ".js"   { $response.ContentType = "application/javascript" }
                ".css"  { $response.ContentType = "text/css" }
                ".png"  { $response.ContentType = "image/png" }
                ".jpg"  { $response.ContentType = "image/jpeg" }
                ".webp" { $response.ContentType = "image/webp" }
                ".json" { $response.ContentType = "application/json" }
                ".md"   { $response.ContentType = "text/markdown" }
            }
            
            $response.OutputStream.Write($content, 0, $content.Length)
        }
        catch {
            $response.StatusCode = 500
        }
    }
    else {
        $response.StatusCode = 404
    }
    
    $response.Close()
}
