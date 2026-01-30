const Settings = require('../model/setting')

class SettingsController {

    async addSettings(req, res) {
        try {
            const { book_fee, late_fine } = req.body
            const userId = req.user.id
            // check existing settings for this user
            const existing = await Settings.findOne({
                userId,
                isActive: true
            })
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Settings already exist for this user'
                })
            }
            const settings = await Settings.create({
                book_fee,
                late_fine,
                userId
            })
            return res.status(201).json({
                success: true,
                message: 'Settings added successfully',
                data: settings
            })
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to add settings',
                error: error.message
            })
        }
    }

    async getSettings(req, res) {
        try {
            const userId = req.user.id

            const settings = await Settings.findOne({
                userId,
            })

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Currently You not set base rate and late fine in settings'
                })
            }

            return res.status(200).json({
                success: true,
                data: settings
            })

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch settings',
                error: error.message
            })
        }
    }

    //  Get single settings by ID (edit page)
    async getSingleSettings(req, res) {
        try {
            const { id } = req.params
            const userId = req.user.id

            const settings = await Settings.findOne({ _id: id, userId })

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Settings not found'
                })
            }

            res.status(200).json({
                success: true,
                data: settings
            })

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch settings',
                error: error.message
            })
        }
    }

    async updateSettings(req, res) {
        try {
            const { book_fee, late_fine } = req.body
            const userId = req.user.id

            const settings = await Settings.findOneAndUpdate(
                { userId, isActive: true },
                { book_fee, late_fine },
                { new: true }
            )

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Settings not found for update'
                })
            }

            return res.status(200).json({
                success: true,
                message: 'Settings updated successfully',
                data: settings
            })

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update settings',
                error: error.message
            })
        }
    }

    //  Toggle isActive true / false
    async toggleSettingsStatus(req, res) {
        try {
            const { id } = req.params
            const userId = req.user.id

            const settings = await Settings.findOne({ _id: id, userId })

            if (!settings) {
                return res.status(404).json({
                    success: false,
                    message: 'Settings not found'
                })
            }

            settings.isActive = !settings.isActive
            await settings.save()

            res.status(200).json({
                success: true,
                message: `Settings ${settings.isActive ? 'Activated' : 'Deactivated'} successfully`,
                data: settings
            })

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Failed to update settings status',
                error: error.message
            })
        }
    }
}

module.exports = new SettingsController()
