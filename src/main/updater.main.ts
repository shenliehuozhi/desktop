import {
    dialog,
    MenuItemConstructorOptions,
} from 'electron';
import { autoUpdater } from 'electron-updater';

import { WindowMain } from './window.main';

import { I18nService } from 'jslib/abstractions/i18n.service';

const UpdaterCheckInitalDelay = 5 * 1000; // 5 seconds
const UpdaterCheckInterval = 12 * 60 * 60 * 1000; // 12 hours

export class UpdaterMain {
    updateMenuItem: MenuItemConstructorOptions;

    private doingUpdateCheck = false;
    private doingUpdateCheckWithFeedback = false;

    constructor(private windowMain: WindowMain, private i18nService: I18nService) { }

    async init() {
        global.setTimeout(async () => await this.checkForUpdate(), UpdaterCheckInitalDelay);
        global.setInterval(async () => await this.checkForUpdate(), UpdaterCheckInterval);

        autoUpdater.on('checking-for-update', () => {
            this.updateMenuItem.enabled = false;
            this.doingUpdateCheck = true;
        });

        autoUpdater.on('update-available', () => {
            if (this.doingUpdateCheckWithFeedback) {
                const result = dialog.showMessageBox(this.windowMain.win, {
                    type: 'info',
                    title: this.i18nService.t('updateAvailable'),
                    message: this.i18nService.t('updateAvailable'),
                    detail: this.i18nService.t('updateAvailableDesc'),
                    buttons: [this.i18nService.t('yes'), this.i18nService.t('no')],
                    cancelId: 1,
                    defaultId: 0,
                    noLink: true,
                });

                if (result === 0) {
                    autoUpdater.downloadUpdate();
                } else {
                    this.reset();
                }
            }
        });

        autoUpdater.on('update-not-available', () => {
            if (this.doingUpdateCheckWithFeedback) {
                dialog.showMessageBox(this.windowMain.win, {
                    message: this.i18nService.t('noUpdatesAvailable'),
                });
            }

            this.reset();
        });

        autoUpdater.on('update-downloaded', (info) => {
            this.updateMenuItem.label = this.i18nService.t('restartToUpdate');

            const result = dialog.showMessageBox(this.windowMain.win, {
                type: 'info',
                title: this.i18nService.t('restartToUpdate'),
                message: this.i18nService.t('restartToUpdate'),
                detail: this.i18nService.t('restartToUpdateDesc', info.version),
                buttons: [this.i18nService.t('restart'), this.i18nService.t('later')],
                cancelId: 1,
                defaultId: 0,
                noLink: true,
            });

            if (result === 0) {
                autoUpdater.quitAndInstall();
            }
        });

        autoUpdater.on('error', (error) => {
            if (this.doingUpdateCheckWithFeedback) {
                dialog.showErrorBox(this.i18nService.t('updateError'),
                    error == null ? this.i18nService.t('unknown') : (error.stack || error).toString());
            }

            this.reset();
        });
    }

    async checkForUpdate(withFeedback: boolean = false) {
        if (this.doingUpdateCheck) {
            return;
        }

        this.doingUpdateCheckWithFeedback = withFeedback;
        if (withFeedback) {
            autoUpdater.autoDownload = false;
        }

        await autoUpdater.checkForUpdates();
    }

    private reset() {
        autoUpdater.autoDownload = true;
        this.updateMenuItem.enabled = true;
        this.doingUpdateCheck = false;
    }
}