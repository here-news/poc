import http from "./http-common";

const upload = (file : File, onUploadProgress: any): Promise<any> => {
    const formData = new FormData() ;

    formData.append('image', file) ;

    return http.post("/uploadFile", formData, {
        headers: {
        "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
    });
};

const getFiles = () : Promise<any> => {
  return http.get("/files");
};

const FileUploadService = {
  upload,
  getFiles,
};

export default FileUploadService;