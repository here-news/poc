import * as React from 'react'
import { toast } from 'react-toastify'
import FileUploadService from 'services/FileUploadService';

const maximum_size : number = 15728640 ;

export const youtubeParser = (url: any) => {
  const regExp = /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[1].length == 11) ? match[1] : false;
}


export const getUrl = (text: string) => {
  const regex = /(https?:\/\/[^\s]+)/g
  const result = text.split(regex)

  for (let i = 0; i < result.length; i++) {
    if (regex.test(result[i])) {
      return result[i]
    }
  }
}

export const getTypeMedia = (mediaName: string) => {
  if(!mediaName) return '';

  const tokens = mediaName.split('_') ;
  return tokens[1] ;
}

export const uploadMedia = (
  selected_files: FileList | null, 
  files : FileList, 
  videoCount : number, 
  tempSizeArray : Number[], 
  tempNameArray : String[],
  uploadedSizeArray : Number[],
  uploadedFileNameArray : String[],
  setUploadedSizeArray : React.Dispatch<React.SetStateAction<Number[]>>,
  setUploadedFileNameArray : React.Dispatch<React.SetStateAction<String[]>>,
  setUploadLoading : React.Dispatch<React.SetStateAction<Boolean>>,
  setFiles : (files: FileList | null) => void | React.Dispatch<React.SetStateAction<FileList | null>>
) => {
  const dt = new DataTransfer()

  if(selected_files) {
    for (let i = 0; i < selected_files.length ; i++) {
      if(selected_files[i].type.search('video') >= 0) videoCount++;
      dt.items.add(selected_files[i])
    }
    tempNameArray = [...uploadedFileNameArray]
    tempSizeArray = [...uploadedSizeArray]
  }

  for (let i = 0; i < (files.length <= 10 ? files.length : 10); i++) {
    if(files[i].type.search('video') >= 0) {
      if(videoCount === 1) {
        toast.error('You can only upload 1 video file')
        return 
      }
      videoCount++
    }

    if(files[i].size > maximum_size) {
      toast.error('You can only upload with maximum size of 15MB');
      return 
    }

    dt.items.add(files[i])
    
    tempSizeArray.push(0)
    tempNameArray.push("")
  }

  setUploadLoading(true)
  setFiles(dt.files)

  const first_index = selected_files ? selected_files.length : 0 

  for(let i = 0 ; i < files.length ; i++) {
    FileUploadService.upload(files[i], (event: any) => {
      tempSizeArray[first_index + i] = Math.round((100 * event.loaded) / event.total)
      setUploadedSizeArray([...tempSizeArray])
    })
    .then((response) => {
      tempSizeArray[first_index + i] = 100
      tempNameArray[first_index + i] = response.data.url
      setUploadedSizeArray([...tempSizeArray])
      setUploadedFileNameArray([...tempNameArray])
    })
    .then((files) => {
    })
    .catch((err) => {
      tempSizeArray.splice(first_index + i , 1) 
      tempNameArray.splice(first_index + i, 1) 

      dt.items.remove(i)
      setFiles(dt.files)
      setUploadedSizeArray([...tempSizeArray])
      setUploadedFileNameArray([...tempNameArray])
    });
  }
}
