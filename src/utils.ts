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