import JoiBase from 'joi'
import { fileListExtension } from 'joi-filelist'

const Joi = fileListExtension(JoiBase)

const createPostValidation = Joi.object({
  title: Joi.string().required().messages({
    'string.empty': 'Title is required',
    'string.required': 'Title is required'
  }),
  content: Joi.string().min(10).required().messages({
    'any.empty': 'Content is required',
    'any.required': 'Content is required',
    'string.empty': 'Content is required',
    'string.required': 'Content is required',
    'string.min': 'Content must be at least 10 characters long'
  }),
  media: Joi.filelist().optional()
})

export { createPostValidation }
