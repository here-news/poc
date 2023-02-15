import axios from 'axios'
import { ENV } from 'lib/env'
import { toast } from 'react-toastify'
import { ILinkDetails } from 'types/interfaces'

const getLinkDetails = async (linkString: string) => {
  let previewData: ILinkDetails | null = null
  try {
    const { data } = await axios.get(
      `${ENV.API_URL}/getLinkDetails/${encodeURIComponent(
        linkString
      )}`
    )
    previewData = {
      ...data.data
    }
  } catch (e) {
    toast.error('There was some error getting the link details!')
  }
  return previewData
}

export default getLinkDetails
