import { useState } from "react";

const ImageUpload = ({ onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const uploadImage = async () => {
    if (!selectedFile) {
      alert("Please select an image!");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      setUploading(true);
      const response = await fetch("https://placevista.onrender.com/analyze-image", { // Changed to /analyze-image
          method: "POST",
          body: formData,
      });

      if (!response.ok) throw new Error(`Server Error: ${response.status}`);

      const data = await response.json();
      setUploading(false);

      if (data.success) {
          onUpload(data.imageUrl, data.places); // Send places data
      } else {
          alert("Upload failed: " + (data.message || "Unknown error"));
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
      <button onClick={uploadImage} className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </div>
  );
};

export default ImageUpload;
