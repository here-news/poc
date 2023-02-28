export const getTypeMedia = (mediaName: string) => {
    if(!mediaName) return '';

    const tokens = mediaName.split('_') ;
    return tokens[1] ;
}
