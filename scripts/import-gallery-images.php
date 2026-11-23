<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../backend/bootstrap.php';

$source = realpath(__DIR__ . '/../assets/images');
if ($source === false) {
    fwrite(STDERR, "Image source folder is unavailable.\n");
    exit(1);
}

// Site branding is deliberately excluded from the public photo gallery.
$excluded = ['logojan.jpg'];
$destination = private_dir() . '/gallery';
if (!is_dir($destination) && !mkdir($destination, 0700, true)) {
    fwrite(STDERR, "Private gallery storage is unavailable.\n");
    exit(1);
}

$imported = 0;
$skipped = 0;
$failed = 0;

foreach (new DirectoryIterator($source) as $entry) {
    if (!$entry->isFile()) {
        continue;
    }

    $original = $entry->getFilename();
    $extension = strtolower($entry->getExtension());
    if (in_array(strtolower($original), $excluded, true) || !in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
        continue;
    }

    $sourcePath = $entry->getPathname();
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($sourcePath);
    $validMimes = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'];
    $dimensions = @getimagesize($sourcePath);
    if (!isset($validMimes[$extension]) || $mime !== $validMimes[$extension] || !$dimensions || $entry->getSize() > 5 * 1024 * 1024) {
        fwrite(STDERR, "Skipped invalid image: {$original}\n");
        $failed++;
        continue;
    }

    if (query('SELECT id FROM gallery WHERE photo=? AND file_path IS NOT NULL AND file_path<>\'\'', [$original])->fetch()) {
        $skipped++;
        continue;
    }

    $stored = bin2hex(random_bytes(24)) . '.' . ($extension === 'jpeg' ? 'jpg' : $extension);
    $targetPath = $destination . '/' . $stored;
    $title = substr(ucwords(str_replace(['-', '_'], ' ', pathinfo($original, PATHINFO_FILENAME))), 0, 150);

    try {
        if (!copy($sourcePath, $targetPath) || !is_readable($targetPath)) {
            throw new RuntimeException('Unable to copy image to private gallery storage.');
        }
        @chmod($targetPath, 0600);
        query('INSERT INTO gallery (photo,title,description,file_path) VALUES (?,?,?,?)', [$original, $title, '', $stored]);
        $imported++;
    } catch (Throwable $error) {
        @unlink($targetPath);
        fwrite(STDERR, "Failed to import {$original}: {$error->getMessage()}\n");
        $failed++;
    }
}

echo "Imported: {$imported}; skipped existing: {$skipped}; failed: {$failed}.\n";
