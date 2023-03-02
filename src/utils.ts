import * as React from 'react'
import { toast } from 'react-toastify'
import FileUploadService from 'services/FileUploadService';
import { IUploadedStatus } from 'types/interfaces';

const maximum_size : number = 15728640 ;

const ErrorYield  = {
  error : true
}

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

export const selectAndUploadMedia = function* (
  prevFiles : string[] | null,
  selected_files: FileList | null, 
  files : FileList,
  uploadedStatus : IUploadedStatus
) : any {
  let videoCount : number = 0 ;
  const maximum_size : number = 15728640 ;

  let tempStatus : IUploadedStatus = {
    ...uploadedStatus
  }

  if(prevFiles) {
    const videoArray = prevFiles.filter(item => getTypeMedia(item) === 'video')

    if(videoArray.length) videoCount++
  }
  
  const dt = new DataTransfer()

  if(selected_files) {
    for (let i = 0; i < selected_files.length ; i++) {
      if(selected_files[i].type.search('video') >= 0) videoCount++;
      dt.items.add(selected_files[i])
    }
   
  }

  for (let i = 0; i < (files.length <= 10 ? files.length : 10); i++) {
    if(files[i].type.search('video') >= 0) {
      if(videoCount === 1) {
        toast.error('You can only upload 1 video file')
        yield ErrorYield
        return 
      }
      videoCount++
    }

    if(files[i].size > maximum_size) {
      toast.error('You can only upload with maximum size of 15MB');
      yield ErrorYield
      return 
    }

    dt.items.add(files[i])
    
    tempStatus = {
      nameArray : [...tempStatus.nameArray, ""],
      sizeArray : [...tempStatus.sizeArray, 0]
    }
  }

  const first_index : number = selected_files ? selected_files.length : 0 

  yield {
    first_index,
    files : dt.files,
    selected:true,
    initialStatus : {...tempStatus}
  }

  for(let i = 0 ; i < files.length ; i++) {
    yield FileUploadService.upload(files[i], (event: any) => {
      tempStatus.sizeArray[first_index + i] = Math.round((100 * event.loaded) / event.total)
    })
  }
}
