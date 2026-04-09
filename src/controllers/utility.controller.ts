import type { Request, Response } from 'express'
import { response } from '../utils/response.js'
import * as statsService from '../services/stats.service.js'

export const getEnums = async (_req: Request, res: Response): Promise<void> => {
  response(res, 200, 'Enums retrieved successfully', {
    genders: ['Male', 'Female'],
    races: ['Malay', 'Chinese', 'Indian', 'Others'],
    states: [
      'Johor', 'Kedah', 'Kelantan', 'Melaka', 'NegeriSembilan', 'Pahang',
      'Perak', 'Perlis', 'PulauPinang', 'Sabah', 'Sarawak', 'Selangor',
      'Terengganu', 'KualaLumpur', 'Labuan', 'Putrajaya',
    ],
    fileCategories: ['PROFILE_PICTURE', 'IC', 'TRANSCRIPT', 'DOCUMENT', 'OTHER'],
    userStatuses: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    userTypes: ['STUDENT', 'LECTURER', 'HEAD_LECTURER'],
  })
}

export const getStats = async (_req: Request, res: Response): Promise<void> => {
  const stats = await statsService.getDashboardStats()
  response(res, 200, 'Stats retrieved successfully', stats)
}
