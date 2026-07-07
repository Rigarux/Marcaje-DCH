const path = require('path');
const fs = require('fs');

/**
 * Returns the absolute directory path and the public URL for a file upload.
 * It also ensures that the directory structure exists.
 * 
 * @param {string} rootDir - The root directory of the project (__dirname from the caller, usually routes/)
 * @param {string} category - The main category folder (e.g., 'materials', 'attendance')
 * @param {string} subCategory - (Optional) A subcategory folder (e.g., a userId for attendance)
 * @param {string} filename - The name of the file to save
 * @returns {Object} An object containing { filepath, publicUrl }
 */
function getUploadPath(rootDir, category, subCategory, filename) {
    // The base uploads directory is always 'uploads' at the root of the project
    // Assuming rootDir is 'routes/', we go up one level
    const baseUploadsDir = path.join(rootDir, '../uploads');
    
    // Build the subpath based on category and subcategory
    let subPath = category;
    if (subCategory) {
        subPath = path.posix.join(category, String(subCategory));
    }
    
    // The absolute directory where the file will be saved
    const targetDir = path.join(baseUploadsDir, subPath);
    
    // Ensure the entire directory structure exists
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // The absolute file path to write the file to
    const filepath = path.join(targetDir, filename);
    
    // The public URL to serve the file (server.js maps /uploads to D:\Marcaje DCH\uploads)
    const publicUrl = `/uploads/${subPath}/${filename}`;
    
    return { filepath, publicUrl };
}

module.exports = {
    getUploadPath
};
