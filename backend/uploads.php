<?php
declare(strict_types=1);
require_once __DIR__.'/bootstrap.php';

class UploadException extends RuntimeException {}

function upload_folder(string $kind): string {
    try { $root=private_dir(); }
    catch (RuntimeException $error) {
        error_log('NGO upload storage: '.$error->getMessage());
        throw new UploadException('Private upload storage is unavailable. Please check the server storage configuration and permissions.');
    }
    $folder=$root.'/'.$kind;
    if ((!is_dir($folder) && !@mkdir($folder,0700,true)) || !is_writable($folder)) {
        throw new UploadException('The upload folder is not writable. Please ask the administrator to check its permissions.');
    }
    return $folder;
}

function check_upload_request_size(): void {
    $limit=trim((string)ini_get('post_max_size'));
    $bytes=(float)$limit;
    $unit=strtolower(substr($limit,-1));
    if($unit==='g')$bytes*=1024*1024*1024;
    elseif($unit==='m')$bytes*=1024*1024;
    elseif($unit==='k')$bytes*=1024;
    if($bytes>0 && (int)($_SERVER['CONTENT_LENGTH']??0)>$bytes) {
        throw new UploadException('This request exceeds the server upload limit. Select a photo or resume of at most 5 MB.');
    }
}

function save_upload(string $key,bool $photo=false,string $photoFolder="gallery"): array {
    $file=$_FILES[$key]??null;
    if(!is_array($file)||!isset($file['error'])||is_array($file['error'])) {
        throw new InvalidArgumentException('Please select a file to upload.');
    }
    $errors=[
        UPLOAD_ERR_INI_SIZE=>'The file exceeds the server upload limit. Maximum allowed file size is 5 MB.',
        UPLOAD_ERR_FORM_SIZE=>'The file is too large. Maximum allowed file size is 5 MB.',
        UPLOAD_ERR_PARTIAL=>'The upload was interrupted. Please select the file again and retry.',
        UPLOAD_ERR_NO_FILE=>'Please select a file to upload.',
        UPLOAD_ERR_NO_TMP_DIR=>'The server temporary upload folder is unavailable. Please contact the administrator.',
        UPLOAD_ERR_CANT_WRITE=>'The server could not write the uploaded file. Please check storage permissions.',
        UPLOAD_ERR_EXTENSION=>'A server extension blocked this upload. Please contact the administrator.'
    ];
    if($file['error']!==UPLOAD_ERR_OK)throw new UploadException($errors[$file['error']]??'The file upload failed. Please try again.');
    $tmp=$file['tmp_name'];
    if(!is_uploaded_file($tmp)||$file['size']<1||$file['size']>5*1024*1024) {
        throw new InvalidArgumentException('File must be between 1 byte and 5 MB.');
    }
    if(!class_exists('finfo'))throw new UploadException('PHP Fileinfo is required to validate uploads. Please enable it on the server.');
    $ext=strtolower(pathinfo($file['name'],PATHINFO_EXTENSION));
    $mime=(new finfo(FILEINFO_MIME_TYPE))->file($tmp);
    if($photo){
        $types=['jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png','webp'=>'image/webp'];
        $info=@getimagesize($tmp);
        if(!isset($types[$ext])||$mime!==$types[$ext]||!$info||$info[0]<1||$info[1]<1||$info[0]*$info[1]>20000000) {
            throw new InvalidArgumentException('Use a valid JPG, PNG or WebP photo of at most 5 MB and 20 megapixels.');
        }
        // Preserve the uploaded image itself, including PNG/WebP transparency.
        // Private files are never executed; photo.php serves only verified raster MIME types.
        if(!in_array($photoFolder,['gallery','payment-proofs'],true))throw new UploadException('Invalid upload destination.');
        $folder=upload_folder($photoFolder);
        $path=bin2hex(random_bytes(24)).'.'.($ext==='jpeg'?'jpg':$ext);
        if(!@move_uploaded_file($tmp,$folder.'/'.$path))throw new UploadException('The photo could not be saved. Please check the upload folder permissions and available disk space.');
        @chmod($folder.'/'.$path,0600);
        if(!is_readable($folder.'/'.$path)) {
            @unlink($folder.'/'.$path);
            throw new UploadException('The saved photo is not readable. Please check the server file permissions.');
        }
        return [$path,$mime,substr(basename($file['name']),0,200)];
    }
    $valid=false;
    if($ext==='pdf')$valid=$mime==='application/pdf'&&str_starts_with(file_get_contents($tmp,false,null,0,5),'%PDF-');
    if($ext==='doc')$valid=in_array($mime,['application/msword','application/x-ole-storage','application/CDFV2'],true)&&file_get_contents($tmp,false,null,0,8)==="\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1";
    if($ext==='docx'&&in_array($mime,['application/zip','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],true)){
        if(!class_exists('ZipArchive'))throw new UploadException('The server needs PHP ZIP enabled to validate DOCX resumes. Please upload a PDF instead or contact the administrator.');
        $zip=new ZipArchive();
        if($zip->open($tmp)===true){
            $valid=$zip->locateName('[Content_Types].xml')!==false&&$zip->locateName('word/document.xml')!==false;
            $total=0;
            for($i=0;$i<$zip->numFiles;$i++){
                $entry=$zip->statIndex($i);$total+=$entry['size'];
                if(str_contains(strtolower($entry['name']),'vbaproject')||$total>25*1024*1024)$valid=false;
            }
            $zip->close();
        }
    }
    if(!$valid)throw new InvalidArgumentException('Resume content must match PDF, DOC or DOCX.');
    $folder=upload_folder('resumes');$path=bin2hex(random_bytes(24)).'.'.$ext;
    if(!@move_uploaded_file($tmp,$folder.'/'.$path))throw new UploadException('Unable to save resume. Please check storage permissions.');
    @chmod($folder.'/'.$path,0600);
    return [$path,$mime,substr(basename($file['name']),0,200)];
}
