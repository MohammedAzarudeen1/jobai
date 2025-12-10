import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IUserSettings extends Document {
  userId: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  resumeUrl?: string
  resumePublicId?: string
  createdAt: Date
  updatedAt: Date
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      default: 'default', // For single-user app, can be extended for multi-user
    },
    smtpHost: {
      type: String,
      required: true,
    },
    smtpPort: {
      type: Number,
      required: true,
      default: 587,
    },
    smtpUser: {
      type: String,
      required: true,
    },
    smtpPassword: {
      type: String,
      required: true,
    },
    fromEmail: {
      type: String,
      required: true,
    },
    fromName: {
      type: String,
      required: true,
    },
    resumeUrl: {
      type: String,
    },
    resumePublicId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
)

const UserSettings: Model<IUserSettings> =
  mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema)

export default UserSettings

