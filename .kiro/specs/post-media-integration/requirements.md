# Requirements Document

## Introduction

ฟีเจอร์นี้เพิ่มความสามารถในการจัดการ Media โดยตรงภายในหน้าสร้าง/แก้ไข Post เพื่อให้ผู้ใช้สามารถอัปโหลดรูปภาพ เลือกรูปปก และจัดการ Media ได้สะดวกขึ้น โดยไม่ต้องไปหน้า Media แยกต่างหาก รวมถึงรองรับการจัดกลุ่ม Media เป็น Folder เพื่อการจัดระเบียบที่ดีขึ้น

## Glossary

- **Post**: บทความในระบบบล็อก
- **Media**: ไฟล์รูปภาพที่อัปโหลดเข้าระบบ
- **Cover_Image**: รูปภาพหลักที่แสดงเป็นปกของ Post
- **Media_Gallery**: คอลเลกชันของ Media ที่เชื่อมโยงกับ Post
- **Media_Folder**: กลุ่มสำหรับจัดระเบียบ Media
- **Post_Form**: ฟอร์มสำหรับสร้างหรือแก้ไข Post
- **Media_Picker**: คอมโพเนนต์สำหรับเลือก Media จากคลัง
- **Inline_Uploader**: คอมโพเนนต์สำหรับอัปโหลด Media โดยตรงในหน้า Post

## Requirements

### Requirement 1

**User Story:** As an editor, I want to upload images directly within the post editing page, so that I can add media without navigating away from my work.

#### Acceptance Criteria

1. WHEN an editor clicks the upload button in the Post_Form THEN the Inline_Uploader SHALL display a drag-and-drop zone for image upload
2. WHEN an editor drags an image file onto the Post_Form THEN the Inline_Uploader SHALL accept the file and begin upload process
3. WHEN an image upload completes successfully THEN the Post_Form SHALL display the uploaded image in the Media_Gallery section
4. IF an upload fails due to invalid file type or size THEN the Post_Form SHALL display a specific error message indicating the failure reason
5. WHILE an upload is in progress THEN the Post_Form SHALL display a progress indicator for each uploading file

### Requirement 2

**User Story:** As an editor, I want to select a cover image for my post, so that readers can see a visual preview of the content.

#### Acceptance Criteria

1. WHEN an editor selects an image from the Media_Gallery THEN the Post_Form SHALL allow setting that image as the Cover_Image
2. WHEN a Cover_Image is set THEN the Post_Form SHALL display a preview of the selected cover image
3. WHEN an editor clicks remove on the Cover_Image THEN the Post_Form SHALL clear the cover image selection
4. WHEN an editor changes the Cover_Image THEN the Post_Form SHALL update the preview immediately
5. WHEN a Post with a Cover_Image is saved THEN the system SHALL persist the Cover_Image reference in the database

### Requirement 3

**User Story:** As an editor, I want to attach multiple media files to a single post, so that I can include various images in my content.

#### Acceptance Criteria

1. WHEN an editor uploads multiple images THEN the Media_Gallery SHALL display all uploaded images
2. WHEN an editor removes an image from the Media_Gallery THEN the Post_Form SHALL update the gallery to exclude that image
3. WHEN a Post is saved THEN the system SHALL persist all Media_Gallery associations
4. WHEN viewing an existing Post THEN the Post_Form SHALL load and display all previously attached media

### Requirement 4

**User Story:** As an editor, I want to browse and select existing media from the library, so that I can reuse previously uploaded images.

#### Acceptance Criteria

1. WHEN an editor opens the Media_Picker THEN the system SHALL display a searchable grid of existing media
2. WHEN an editor searches in the Media_Picker THEN the system SHALL filter results by filename
3. WHEN an editor selects media from the Media_Picker THEN the Post_Form SHALL add the selected media to the Media_Gallery
4. WHEN the Media_Picker opens THEN the system SHALL load media with pagination support

### Requirement 5

**User Story:** As an editor, I want to organize media into folders, so that I can keep my media library organized.

#### Acceptance Criteria

1. WHEN an editor creates a new Media_Folder THEN the system SHALL store the folder with a unique name
2. WHEN an editor uploads media THEN the Inline_Uploader SHALL allow selecting a target Media_Folder
3. WHEN viewing the Media_Picker THEN the system SHALL display media organized by Media_Folder
4. WHEN an editor moves media to a different folder THEN the system SHALL update the media's folder association
5. IF an editor attempts to create a folder with a duplicate name THEN the system SHALL reject the creation and display an error message
6. WHEN viewing the Media Library THEN the system SHALL display folders as clickable cards alongside media items
7. WHEN an editor clicks on a folder card THEN the system SHALL navigate into that folder and display its contents
8. WHEN an editor drags a media item onto a folder card THEN the system SHALL move that media into the folder
9. WHEN viewing inside a folder THEN the system SHALL display a breadcrumb navigation to return to parent view
10. WHEN an editor is inside a folder THEN the system SHALL only display media belonging to that folder

### Requirement 6

**User Story:** As a developer, I want the media data to be properly serialized and deserialized, so that media associations are correctly stored and retrieved.

#### Acceptance Criteria

1. WHEN saving Post media associations THEN the system SHALL serialize the data to the database correctly
2. WHEN loading Post media associations THEN the system SHALL deserialize the data and return the correct media items
3. WHEN serializing then deserializing media data THEN the system SHALL produce equivalent data (round-trip consistency)
