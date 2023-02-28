import axios from "axios";
import { ENV } from 'lib/env';

export default axios.create({
  baseURL: `${ENV.API_URL}`,
  headers: {
    "Content-type": "application/json",
  },
});