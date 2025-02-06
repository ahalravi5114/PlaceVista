import { useState } from "react";

const ImageUpload = ({ onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadImage = async () => {
    if (!selectedFile) return alert("Please select an image!");
  
    const formData = new FormData();
    formData.append("image", selectedFile);
  
    try {
      setUploading(true);
      const response = await fetch("https://placevista.onrender.com/upload", {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(`Server Error: ${response.status} ${response.statusText}`);
      }
  
      const data = await response.json().catch(() => {
        throw new Error("Invalid JSON response from server");
      });
  
      setUploading(false);
  
      if (data.imageUrl) {
        onUpload(data.imageUrl);
      } else {
        alert("Upload failed: No image URL returned");
      }
    } catch (error) {
      setUploading(false);
      console.error("Upload error:", error);
      alert(`Upload failed: ${error.message}`);
    }
  };
  
  return (
    <div className="p-4">
      <input type="file" onChange={handleFileChange} className="mb-2" />
      <button onClick={uploadImage} className="bg-indigo-600 text-white px-4 py-2 rounded">
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default ImageUpload;
