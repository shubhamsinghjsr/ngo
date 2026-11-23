<?php
require __DIR__.'/../backend/bootstrap.php';header('Content-Type: application/json');header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');
echo json_encode(['ok'=>true,'photos'=>query("SELECT id,title,description FROM gallery WHERE archived_at IS NULL AND file_path IS NOT NULL AND file_path<>'' ORDER BY id DESC LIMIT 1000")->fetchAll()],JSON_INVALID_UTF8_SUBSTITUTE);
