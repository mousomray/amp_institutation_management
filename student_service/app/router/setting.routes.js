const express = require('express');
const settingController = require('../controller/setting.controller')
const { Auth } = require('../middleware/Auth')
const router = express.Router()

router.post('/book/createsetting', Auth, settingController.addSettings)
router.get('/book/settings', Auth, settingController.getSettings)
router.get('/book/settings/:id', Auth, settingController.getSingleSettings)
router.put('/book/updatesettings/:id', Auth, settingController.updateSettings)
router.put('/book/togglesettings/:id', Auth, settingController.toggleSettingsStatus)

module.exports = router