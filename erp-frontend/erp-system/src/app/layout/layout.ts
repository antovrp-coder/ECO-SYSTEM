import { Component, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from '@simplewebauthn/browser';
import {
  LanguageId,
  LanguageOption,
  ThemeLabelKey,
  TranslationKey,
} from '../i18n/translations';
import { I18nService } from '../services/i18n.service';
import { NotificationService } from '../services/notification.service';
import { NotificationComponent } from '../components/notification/notification';
import { EcommerceWorkspaceComponent } from '../components/ecommerce-workspace/ecommerce-workspace';
import { PosWorkspaceComponent } from '../components/pos-workspace/pos-workspace';
import { HrWorkspaceComponent } from '../components/hr-workspace/hr-workspace';
import { InventoryWorkspaceComponent } from '../components/inventory-workspace/inventory-workspace';
import { CrmWorkspaceComponent } from '../components/crm-workspace/crm-workspace';
import { FinanceWorkspaceComponent } from '../components/finance-workspace/finance-workspace';
import { PurchaseWorkspaceComponent } from '../components/purchase-workspace/purchase-workspace';

const API_BASE_URL = '';
const FACE_API_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
const FACE_API_MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
type ThemeId = 'light' | 'dark' | 'sunrise' | 'forest' | 'ocean' | 'rose' | 'amber' | 'lavender' | 'slate' | 'mint';
type CameraMode = 'login-face' | 'enroll-face';
type SpeechRecognitionConstructor = new () => any;

declare global {
  interface Window {
    faceapi?: any;
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface ThemeOption {
  id: ThemeId;
  labelKey: ThemeLabelKey;
  icon: string;
}

interface ModuleItem {
  id: number;
  name: string;
  icon: string;
  subMenus?: string[];
}

interface WorkspaceTab {
  moduleId: number;
  moduleName: string;
  subMenu: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  faceImage?: string;
  localizedDisplayNames?: LocalizedDisplayNames;
  hasFaceLogin?: boolean;
  hasPasskey?: boolean;
}

type LocalizedDisplayNames = Partial<Record<LanguageId, string>>;

@Component({
  selector: 'app-layout',
  imports: [
    CommonModule,
    FormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    NotificationComponent,
    EcommerceWorkspaceComponent,
    PosWorkspaceComponent,
    HrWorkspaceComponent,
    InventoryWorkspaceComponent,
    CrmWorkspaceComponent,
    FinanceWorkspaceComponent,
    PurchaseWorkspaceComponent
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout implements OnInit, OnDestroy {
  private readonly voiceAssistantStorageKey = 'erpVoiceAssistantEnabled';
  private cameraVideoRef?: ElementRef<HTMLVideoElement>;
  private cameraPreviewCanvasRef?: ElementRef<HTMLCanvasElement>;
  private cameraPreviewFrameHandle: number | null = null;
  private voiceRecognition: any = null;
  private voiceRecognitionSettleHandle: ReturnType<typeof setTimeout> | null = null;
  private voiceRecognitionRetryHandle: ReturnType<typeof setTimeout> | null = null;
  private pendingVoiceTranscript = '';
  private voiceCommandHandled = false;
  private voiceNetworkRetryCount = 0;

  @ViewChild('cameraVideo')
  private set cameraVideoElementRef(value: ElementRef<HTMLVideoElement> | undefined) {
    this.cameraVideoRef = value;
    if (value && this.cameraPromptOpen && this.cameraStream) {
      void this.attachCameraStream(0);
    }
  }

  @ViewChild('cameraPreviewCanvas')
  private set cameraPreviewCanvasElementRef(value: ElementRef<HTMLCanvasElement> | undefined) {
    this.cameraPreviewCanvasRef = value;
    if (value && this.cameraReady && this.cameraPromptOpen) {
      this.startCameraPreview();
    }
  }

  @ViewChild('cameraCaptureDialog') private cameraCaptureDialogRef?: ElementRef<HTMLElement>;
  modules: ModuleItem[] = [];
  selectedModule: ModuleItem | null = null;
  tabs: WorkspaceTab[] = [];
  sidebarExpanded = false;
  backendStatusMessage = '';
  profilePanelOpen = false;
  themeMode: ThemeId = 'light';
  private i18nService = inject(I18nService);
  readonly themes: ThemeOption[] = [
    { id: 'light', labelKey: 'themeCloud', icon: 'light_mode' },
    { id: 'dark', labelKey: 'themeMidnight', icon: 'dark_mode' },
    { id: 'sunrise', labelKey: 'themeSunrise', icon: 'wb_sunny' },
    { id: 'forest', labelKey: 'themeForest', icon: 'park' },
    { id: 'ocean', labelKey: 'themeOcean', icon: 'water' },
    { id: 'rose', labelKey: 'themeRose', icon: 'local_florist' },
    { id: 'amber', labelKey: 'themeAmber', icon: 'flare' },
    { id: 'lavender', labelKey: 'themeLavender', icon: 'spa' },
    { id: 'slate', labelKey: 'themeSlate', icon: 'layers' },
    { id: 'mint', labelKey: 'themeMint', icon: 'eco' }
  ];
  readonly languages: LanguageOption[] = this.i18nService.languages;
  authMode: 'login' | 'signup' = 'login';
  user: User | null = null;
  authError = '';
  cameraError = '';
  passkeySupported = browserSupportsWebAuthn();
  platformPasskeyAvailable = false;
  cameraSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  voiceAssistantSupported = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  voiceAssistantEnabled = true;
  voiceListening = false;
  voiceSpeaking = false;
  voiceStatusMessage = '';
  voiceLastCommand = '';
  passkeyBusy = false;
  faceBusy = false;
  loginPasskeyAvailable = false;
  loginPasskeyStatusKnown = false;
  loginFaceAvailable = false;
  loginFaceStatusKnown = false;
  cameraPromptOpen = false;
  cameraReady = false;
  cameraMode: CameraMode | null = null;
  greetingMessage = '';
  displayNameInput = '';
  private localizedDisplayNames: LocalizedDisplayNames = {};
  private document = inject(DOCUMENT);
  private ngZone = inject(NgZone);
  private cameraStream: MediaStream | null = null;
  private faceApiLoadPromise: Promise<any> | null = null;
  private loginPasskeyLookupHandle: ReturnType<typeof setTimeout> | null = null;
  private loginPasskeyLookupVersion = 0;
  private loginFaceLookupVersion = 0;
  private greetingRefreshHandle: ReturnType<typeof setInterval> | null = null;
  loginData = {
    username: '',
    password: ''
  };
  signupData = {
    username: '',
    email: '',
    fullName: '',
    password: ''
  };

  get language(): LanguageId {
    return this.i18nService.language;
  }

  ngOnInit() {
    if (this.redirectToLocalhostForPasskeys()) {
      return;
    }

    this.loadVoiceAssistantPreference();

    const storedTheme = localStorage.getItem('erpTheme');
    if (this.themes.some(theme => theme.id === storedTheme)) {
      this.themeMode = storedTheme as ThemeId;
    }
    this.applyTheme();

    const stored = localStorage.getItem('erpUser');
    if (stored) {
      try {
        this.user = this.normalizeStoredUser(JSON.parse(stored));
        this.loadLocalizedDisplayNames();
      } catch {
        this.user = null;
      }
    }

    void this.detectPasskeyAvailability();
    void this.refreshCurrentUserPasskeyState();
    void this.refreshCurrentUserFaceState();
    this.refreshGreetingMessage();
    this.startGreetingRefresh();
    this.loadModules();
  }

  ngOnDestroy() {
    if (this.greetingRefreshHandle) {
      clearInterval(this.greetingRefreshHandle);
      this.greetingRefreshHandle = null;
    }

    this.stopVoiceAssistant();
    this.stopCameraStream();
  }

  constructor(private notificationService: NotificationService) {}

  private async apiRequest(path: string, init?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, init);
      this.backendStatusMessage = '';
      return response;
    } catch (error) {
      const apiLocation = API_BASE_URL || 'the current app origin';
      this.backendStatusMessage = this.t('backendUnavailable', { location: apiLocation });
      throw error;
    }
  }

  async loadModules() {
    try {
      const response = await this.apiRequest('/api/modules');
      if (!response.ok) {
        throw new Error('Failed to load modules');
      }
      const modules = await this.readApiBody<any[]>(response, 'module list');
      this.modules = modules.map((module: any) => ({
        id: module.id,
        name: module.name,
        icon: module.icon || 'folder',
        subMenus: []
      }));
      if (this.modules.length && !this.selectedModule) {
        this.selectModule(this.modules[0]);
      }
    } catch (error) {
      console.error(error);
      this.modules = [];
      this.selectedModule = null;
    }
  }

  async selectModule(module: ModuleItem) {
    this.selectedModule = module;
    await this.loadSubMenus(module);
  }

  async loadSubMenus(module: ModuleItem) {
    try {
      const response = await this.apiRequest(`/api/modules/${module.id}/menus`);
      if (!response.ok) {
        throw new Error('Failed to load submenu items');
      }
      const menus = await this.readApiBody<any[]>(response, 'submenu list');
      this.selectedModule = {
        ...module,
        subMenus: menus.map((item: any) => item.name)
      };
    } catch (error) {
      console.error(error);
      this.selectedModule = { ...module, subMenus: [] };
    }
  }

  async login() {
    this.authError = '';
    const startTime = Date.now();
    try {
      const response = await this.apiRequest('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.loginData)
      });
      const result = await this.readApiBody<any>(response, 'login response');
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        this.authError = this.translateApiError(result.error, this.t('loginFailed'));
        this.notificationService.error(`${this.authError} (${duration}ms)`, 5000);
        return;
      }
      this.persistAuthenticatedUser(result);
      this.notificationService.success(this.t('loginSuccessful', { duration }), 3000);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(error);
      this.authError = this.backendStatusMessage || this.t('loginFailed');
      this.notificationService.error(`${this.authError} (${duration}ms)`, 5000);
    }
  }

  async signup() {
    this.authError = '';
    const startTime = Date.now();
    try {
      const payload = {
        username: this.signupData.username,
        email: this.signupData.email,
        full_name: this.signupData.fullName,
        password: this.signupData.password,
      };

      const response = await this.apiRequest('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await this.readApiBody<any>(response, 'signup response');
      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        this.authError = this.translateApiError(result.error, this.t('signupFailed'));
        this.notificationService.error(`${this.authError} (${duration}ms)`, 5000);
        return;
      }
      this.persistAuthenticatedUser(result);
      this.notificationService.success(this.t('signupSuccessful', { duration }), 3000);
      this.signupData.password = '';
      this.notificationService.info(this.t('signupFingerprintInfo'), 4500);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(error);
      this.authError = this.backendStatusMessage || this.t('signupFailed');
      this.notificationService.error(`${this.authError} (${duration}ms)`, 5000);
    }
  }

  logout() {
    this.stopVoiceAssistant();
    this.closeCameraPrompt();
    this.user = null;
    this.localizedDisplayNames = {};
    this.displayNameInput = '';
    this.refreshGreetingMessage();
    localStorage.removeItem('erpUser');
    this.syncLoginPasskeyAvailabilityFromUser();
    this.syncLoginFaceAvailabilityFromUser();
    this.notificationService.success(this.t('loggedOut'), 2000);
  }

  async loginWithPasskey() {
    if (!this.ensurePasskeySupport()) {
      return;
    }

    this.authError = '';
    this.passkeyBusy = true;
    const startTime = Date.now();

    try {
      const beginResponse = await this.apiRequest('/api/auth/passkey/login/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.loginData.username,
        }),
      });
      const beginResult = await this.readApiBody<any>(beginResponse, 'passkey login start response');

      if (!beginResponse.ok) {
        throw new Error(this.translateApiError(beginResult.error, this.t('fingerprintLoginFailed')));
      }

      const credential = await startAuthentication({
        optionsJSON: this.extractWebAuthnOptions(beginResult.options),
      });

      const finishResponse = await this.apiRequest('/api/auth/passkey/login/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: beginResult.session_id,
          credential,
        }),
      });
      const finishResult = await this.readApiBody<any>(finishResponse, 'passkey login finish response');
      const duration = Date.now() - startTime;

      if (!finishResponse.ok) {
        throw new Error(this.translateApiError(finishResult.error, this.t('fingerprintLoginFailed')));
      }

      this.runInUiContext(() => {
        this.persistAuthenticatedUser(finishResult);
        this.notificationService.success(this.t('fingerprintLoginSuccessful', { duration }), 3000);
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = this.describeAuthError(error, this.t('fingerprintLoginFailed'));
      this.runInUiContext(() => {
        this.authError = message;
        this.notificationService.error(`${message} (${duration}ms)`, 5000);
      });
    } finally {
      this.runInUiContext(() => {
        this.passkeyBusy = false;
      });
    }
  }

  async enrollPasskey() {
    if (!this.ensurePasskeySupport() || !this.ensurePlatformPasskeyAvailable() || !this.user) {
      return;
    }

    this.authError = '';
    this.passkeyBusy = true;
    const startTime = Date.now();

    try {
      const beginResponse = await this.apiRequest('/api/auth/passkey/enroll/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.user.id,
          username: this.user.username,
        }),
      });
      const beginResult = await this.readApiBody<any>(beginResponse, 'passkey enrollment start response');

      if (!beginResponse.ok) {
        throw new Error(this.translateApiError(beginResult.error, this.t('fingerprintEnrollmentFailed')));
      }

      const credential = await startRegistration({
        optionsJSON: this.extractWebAuthnOptions(beginResult.options),
      });

      const finishResponse = await this.apiRequest('/api/auth/passkey/enroll/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: beginResult.session_id,
          credential,
        }),
      });
      const finishResult = await this.readApiBody<any>(finishResponse, 'passkey enrollment finish response');
      const duration = Date.now() - startTime;

      if (!finishResponse.ok) {
        throw new Error(this.translateApiError(finishResult.error, this.t('fingerprintEnrollmentFailed')));
      }

      this.runInUiContext(() => {
        this.persistAuthenticatedUser(finishResult);
        this.notificationService.success(this.t('fingerprintEnrollmentSuccessful', { duration }), 3000);
      });
      await this.refreshCurrentUserPasskeyState();
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = this.describeAuthError(error, this.t('fingerprintEnrollmentFailed'));
      this.runInUiContext(() => {
        this.authError = message;
        this.notificationService.error(`${message} (${duration}ms)`, 5000);
      });
    } finally {
      this.runInUiContext(() => {
        this.passkeyBusy = false;
      });
    }
  }

  async disablePasskey() {
    if (!this.user) {
      return;
    }

    this.authError = '';
    this.passkeyBusy = true;

    try {
      const response = await this.apiRequest('/api/auth/passkey/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.user.id,
          username: this.user.username,
        }),
      });
      const result = await this.readApiBody<any>(response, 'passkey disable response');

      if (!response.ok) {
        throw new Error(this.translateApiError(result.error, this.t('fingerprintDisabledFailure')));
      }

      this.runInUiContext(() => {
        this.persistAuthenticatedUser(result);
        this.syncLoginPasskeyAvailabilityFromUser();
        this.notificationService.success(this.t('fingerprintDisabledSuccess'), 3000);
      });
      await this.refreshCurrentUserPasskeyState();
    } catch (error) {
      const message = this.describeAuthError(error, this.t('fingerprintDisabledFailure'));
      this.runInUiContext(() => {
        this.authError = message;
        this.notificationService.error(message, 5000);
      });
    } finally {
      this.runInUiContext(() => {
        this.passkeyBusy = false;
      });
    }
  }

  async openFaceEnrollment() {
    if (!this.user) {
      return;
    }

    this.authError = '';
    await this.startCameraPrompt('enroll-face');
  }

  async loginWithCamera() {
    if (!this.loginData.username.trim()) {
      this.authError = this.t('usernameRequired');
      this.notificationService.warning(this.authError, 3000);
      return;
    }

    this.authError = '';
    await this.startCameraPrompt('login-face');
  }

  async disableFaceLogin() {
    if (!this.user) {
      return;
    }

    this.authError = '';
    this.faceBusy = true;

    try {
      const response = await this.apiRequest('/api/auth/face/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.user.id,
          username: this.user.username,
        }),
      });
      const result = await this.readApiBody<any>(response, 'face disable response');

      if (!response.ok) {
        throw new Error(this.translateApiError(result.error, this.t('faceLoginDisableFailed')));
      }

      this.persistAuthenticatedUser(result);
      this.syncLoginFaceAvailabilityFromUser();
      this.notificationService.success(this.t('faceLoginDisabledSuccess'), 3000);
      await this.refreshCurrentUserFaceState();
    } catch (error) {
      const message = this.describeAuthError(error, this.t('faceLoginDisableFailed'));
      this.authError = message;
      this.notificationService.error(message, 5000);
    } finally {
      this.faceBusy = false;
    }
  }

  onLoginUsernameChange() {
    const username = this.loginData.username.trim();

    if (this.loginPasskeyLookupHandle) {
      clearTimeout(this.loginPasskeyLookupHandle);
      this.loginPasskeyLookupHandle = null;
    }

    if (!username) {
      this.loginPasskeyStatusKnown = false;
      this.loginPasskeyAvailable = false;
      this.loginFaceStatusKnown = false;
      this.loginFaceAvailable = false;
      return;
    }

    this.loginPasskeyStatusKnown = false;
    this.loginPasskeyAvailable = false;
    this.loginFaceStatusKnown = false;
    this.loginFaceAvailable = false;

    if (this.user?.username === username) {
      this.loginPasskeyStatusKnown = true;
      this.loginPasskeyAvailable = Boolean(this.user.hasPasskey);
      this.loginFaceStatusKnown = true;
      this.loginFaceAvailable = Boolean(this.user.hasFaceLogin);
      return;
    }

    this.loginPasskeyLookupHandle = setTimeout(() => {
      this.loginPasskeyLookupHandle = null;
      void this.refreshLoginPasskeyAvailability(username);
      void this.refreshLoginFaceAvailability(username);
    }, 250);
  }

  openTab(subMenu: string) {
    if (!this.selectedModule) {
      return;
    }

    const existingTab = this.tabs.find((tab) => tab.moduleId === this.selectedModule?.id && tab.subMenu === subMenu);
    if (!existingTab) {
      this.tabs.push({
        moduleId: this.selectedModule.id,
        moduleName: this.selectedModule.name,
        subMenu,
      });
    }
  }

  closeTab(index: number) {
    this.tabs.splice(index, 1);
  }

  isEcommerceTab(tab: WorkspaceTab): boolean {
    const normalized = this.normalizeWorkspaceKey(tab.moduleName);
    return normalized === 'e commerce' || normalized === 'ecommerce';
  }

  isPosTab(tab: WorkspaceTab): boolean {
    return this.normalizeWorkspaceKey(tab.moduleName) === 'sales' && this.normalizeWorkspaceKey(tab.subMenu) === 'pos';
  }

  isHrTab(tab: WorkspaceTab): boolean {
    return this.normalizeWorkspaceKey(tab.moduleName) === 'hr';
  }

  isInventoryTab(tab: WorkspaceTab): boolean {
    return this.normalizeWorkspaceKey(tab.moduleName) === 'inventory';
  }

  isCrmTab(tab: WorkspaceTab): boolean {
    return this.normalizeWorkspaceKey(tab.moduleName) === 'crm';
  }

  isFinanceTab(tab: WorkspaceTab): boolean {
    return this.normalizeWorkspaceKey(tab.moduleName) === 'finance';
  }

  isPurchaseTab(tab: WorkspaceTab): boolean {
    return this.normalizeWorkspaceKey(tab.moduleName) === 'purchase';
  }

  toggleSidebar(expanded: boolean) {
    this.sidebarExpanded = expanded;
  }

  toggleProfilePanel() {
    this.profilePanelOpen = !this.profilePanelOpen;
    if (this.profilePanelOpen) {
      void this.refreshCurrentUserPasskeyState();
      void this.refreshCurrentUserFaceState();
    }
  }

  closeProfilePanel() {
    this.profilePanelOpen = false;
  }

  setTheme(themeId: ThemeId) {
    if (this.themeMode === themeId) {
      return;
    }

    this.themeMode = themeId;
    localStorage.setItem('erpTheme', this.themeMode);
    this.applyTheme();
    const selectedTheme = this.themes.find(theme => theme.id === themeId);
    this.notificationService.info(this.t('themeChanged', { theme: selectedTheme ? this.t(selectedTheme.labelKey) : themeId }), 2000);
    this.profilePanelOpen = true;
  }

  setLanguage(languageId: LanguageId) {
    if (this.i18nService.language === languageId) {
      return;
    }

    this.i18nService.setLanguage(languageId);
    if (this.voiceRecognition) {
      this.voiceRecognition.lang = this.getVoiceRecognitionLanguage();
    }
    this.syncDisplayNameInput();
    this.refreshGreetingMessage();
    this.notificationService.info(this.t('languageChanged', { language: this.getLanguageLabel(languageId) }), 2000);
    this.profilePanelOpen = true;
  }

  toggleVoiceAssistantSetting() {
    this.setVoiceAssistantEnabled(!this.voiceAssistantEnabled);
  }

  toggleVoiceListening() {
    if (this.voiceListening) {
      this.stopVoiceAssistant();
      return;
    }

    this.startVoiceAssistant();
  }

  saveLocalizedDisplayName() {
    if (!this.user) {
      return;
    }

    void this.persistLocalizedDisplayNames();
  }

  private async persistLocalizedDisplayNames() {
    if (!this.user) {
      return;
    }

    const value = this.displayNameInput.trim();
    if (value) {
      this.localizedDisplayNames[this.language] = value;
    } else {
      delete this.localizedDisplayNames[this.language];
    }

    try {
      const response = await this.apiRequest('/api/auth/profile/display-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: this.user.id,
          username: this.user.username,
          display_names: this.localizedDisplayNames,
        }),
      });
      const result = await this.readApiBody<any>(response, 'localized display names response');

      if (!response.ok) {
        throw new Error(this.translateApiError(result.error, this.t('displayNameSaved', { language: this.getLanguageLabel(this.language) })));
      }

      this.persistAuthenticatedUser(result);
      this.refreshGreetingMessage();
      this.notificationService.success(this.t('displayNameSaved', { language: this.getLanguageLabel(this.language) }), 2500);
    } catch (error) {
      const fallbackNames = { ...(this.user.localizedDisplayNames ?? {}) };
      this.localizedDisplayNames = fallbackNames;
      this.syncDisplayNameInput();
      const message = this.describeAuthError(error, this.t('loadUserAccountFailed'));
      this.notificationService.error(message, 4000);
    }
  }

  getDisplayName(): string {
    if (!this.user) {
      return '';
    }

    return this.localizedDisplayNames[this.language]?.trim() || this.user.fullName?.trim() || this.user.username;
  }

  private applyTheme() {
    this.document.body.classList.remove(...this.themes.map(theme => `app-theme-${theme.id}`));
    this.document.body.classList.add(`app-theme-${this.themeMode}`);
  }

  private startGreetingRefresh() {
    if (this.greetingRefreshHandle) {
      clearInterval(this.greetingRefreshHandle);
    }

    this.greetingRefreshHandle = setInterval(() => {
      this.runInUiContext(() => {
        this.refreshGreetingMessage();
      });
    }, 60_000);
  }

  private refreshGreetingMessage() {
    if (!this.user) {
      this.greetingMessage = '';
      return;
    }

    const hour = new Date().getHours();
    let greeting = this.t('goodEvening');

    if (hour < 12) {
      greeting = this.t('goodMorning');
    } else if (hour < 17) {
      greeting = this.t('goodAfternoon');
    }

    const displayName = this.getDisplayName();
    this.greetingMessage = this.t('welcomeGreeting', { username: displayName, greeting });
  }

  private persistAuthenticatedUser(result: any) {
    this.user = {
      id: result.id,
      username: result.username,
      email: result.email,
      fullName: result.full_name ?? result.fullName ?? '',
      faceImage: result.face_image ?? result.faceImage ?? '',
      localizedDisplayNames: result.localized_display_names ?? result.localizedDisplayNames ?? {},
      hasFaceLogin: Boolean(result.has_face_login ?? result.hasFaceLogin),
      hasPasskey: Boolean(result.has_passkey ?? result.hasPasskey),
    };
    this.loadLocalizedDisplayNames();
    this.refreshGreetingMessage();
    localStorage.setItem('erpUser', JSON.stringify(this.user));
    this.syncLoginPasskeyAvailabilityFromUser();
    this.syncLoginFaceAvailabilityFromUser();
  }

  private normalizeStoredUser(stored: any): User {
    return {
      id: stored.id,
      username: stored.username,
      email: stored.email,
      fullName: stored.fullName ?? stored.full_name ?? '',
      faceImage: stored.faceImage ?? stored.face_image ?? '',
      localizedDisplayNames: stored.localizedDisplayNames ?? stored.localized_display_names ?? {},
      hasFaceLogin: Boolean(stored.hasFaceLogin ?? stored.has_face_login),
      hasPasskey: Boolean(stored.hasPasskey ?? stored.has_passkey),
    };
  }

  getProfileImageSrc(): string | null {
    const value = this.user?.faceImage?.trim();
    return value ? value : null;
  }

  private ensurePasskeySupport(): boolean {
    if (this.passkeySupported) {
      return true;
    }

    this.authError = this.t('browserNoPasskeySupport');
    this.notificationService.warning(this.authError, 4000);
    return false;
  }

  private loadVoiceAssistantPreference() {
    const storedValue = localStorage.getItem(this.voiceAssistantStorageKey);
    if (storedValue === 'false') {
      this.voiceAssistantEnabled = false;
    } else if (storedValue === 'true') {
      this.voiceAssistantEnabled = true;
    }

    this.voiceStatusMessage = this.voiceAssistantEnabled
      ? this.t('voiceAssistantIdle')
      : this.t('voiceAssistantDisabledCopy');
  }

  private setVoiceAssistantEnabled(enabled: boolean) {
    this.voiceAssistantEnabled = enabled;
    localStorage.setItem(this.voiceAssistantStorageKey, String(enabled));

    if (!enabled) {
      this.stopVoiceAssistant();
      this.voiceStatusMessage = this.t('voiceAssistantDisabledCopy');
      this.notificationService.info(this.t('voiceAssistantDisabledMessage'), 2500);
      return;
    }

    this.voiceStatusMessage = this.t('voiceAssistantIdle');
    this.notificationService.success(this.t('voiceAssistantEnabledMessage'), 2500);
  }

  private startVoiceAssistant() {
    if (!this.voiceAssistantEnabled) {
      this.notificationService.warning(this.t('voiceAssistantDisabledCopy'), 3000);
      return;
    }

    if (!this.voiceAssistantSupported) {
      this.notificationService.warning(this.t('voiceAssistantUnsupported'), 3000);
      return;
    }

    if (!this.voiceRecognition) {
      this.initializeVoiceRecognition();
    }

    if (!this.voiceRecognition) {
      this.notificationService.warning(this.t('voiceAssistantUnsupported'), 3000);
      return;
    }

    this.voiceStatusMessage = this.t('voiceAssistantPreparing');
    this.voiceNetworkRetryCount = 0;
    void this.beginVoiceRecognition();
  }

  private async beginVoiceRecognition() {
    const hasMicrophonePermission = await this.ensureMicrophonePermission();
    if (!hasMicrophonePermission || !this.voiceRecognition) {
      return;
    }

    this.resetVoiceRecognitionTracking();
    this.voiceStatusMessage = this.t('voiceAssistantListening');
    try {
      this.voiceRecognition.lang = this.getVoiceRecognitionLanguage();
      this.voiceRecognition.start();
    } catch (error) {
      const message = this.describeVoiceStartError(error);
      this.voiceListening = false;
      this.voiceStatusMessage = message;
      this.notificationService.warning(message, 3500);
    }
  }

  private stopVoiceAssistant() {
    this.clearVoiceRecognitionSettleHandle();
    this.clearVoiceRecognitionRetryHandle();
    this.pendingVoiceTranscript = '';
    this.voiceCommandHandled = false;
    this.voiceNetworkRetryCount = 0;
    this.voiceSpeaking = false;

    const speechSynthesis = this.document.defaultView?.speechSynthesis;
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }

    if (this.voiceRecognition) {
      try {
        this.voiceRecognition.stop();
      } catch {
        // Ignore stop errors from inactive recognizers.
      }
    }

    this.voiceListening = false;
    if (this.voiceAssistantEnabled) {
      this.voiceStatusMessage = this.t('voiceAssistantIdle');
    }
  }

  private initializeVoiceRecognition() {
    const SpeechRecognition = this.document.defaultView?.SpeechRecognition ?? this.document.defaultView?.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.voiceRecognition = null;
      return;
    }

    this.voiceRecognition = new SpeechRecognition();
  this.voiceRecognition.continuous = false;
    this.voiceRecognition.interimResults = true;
    this.voiceRecognition.maxAlternatives = 1;
    this.voiceRecognition.lang = this.getVoiceRecognitionLanguage();
    this.voiceRecognition.onaudiostart = () => {
      this.runInUiContext(() => {
        this.voiceStatusMessage = this.t('voiceAssistantAudioDetected');
      });
    };
    this.voiceRecognition.onspeechstart = () => {
      this.runInUiContext(() => {
        this.voiceStatusMessage = this.t('voiceAssistantSpeechDetected');
      });
    };
    this.voiceRecognition.onstart = () => {
      this.runInUiContext(() => {
        this.resetVoiceRecognitionTracking();
        this.clearVoiceRecognitionRetryHandle();
        this.voiceNetworkRetryCount = 0;
        this.voiceListening = true;
        this.voiceStatusMessage = this.t('voiceAssistantListening');
      });
    };
    this.voiceRecognition.onend = () => {
      this.runInUiContext(() => {
        this.voiceListening = false;
        if (!this.voiceCommandHandled && this.pendingVoiceTranscript) {
          const transcript = this.pendingVoiceTranscript;
          this.pendingVoiceTranscript = '';
          this.voiceCommandHandled = true;
          void this.handleVoiceCommand(transcript);
          return;
        }

        if (this.voiceAssistantEnabled && (this.voiceStatusMessage === this.t('voiceAssistantListening') || this.voiceStatusMessage === this.t('voiceAssistantSpeechDetected'))) {
          this.voiceStatusMessage = this.t('voiceAssistantIdle');
        }
      });
    };
    this.voiceRecognition.onerror = (event: any) => {
      this.runInUiContext(() => {
        this.voiceListening = false;

        if (event?.error === 'no-speech') {
          this.voiceStatusMessage = this.t('voiceAssistantNoSpeech');
          return;
        }

        if (event?.error === 'not-allowed') {
          this.voiceStatusMessage = this.t('voiceAssistantPermissionDenied');
          this.notificationService.warning(this.voiceStatusMessage, 3500);
          return;
        }

        if (event?.error === 'service-not-allowed') {
          this.voiceStatusMessage = this.t('voiceAssistantPermissionDenied');
          this.notificationService.warning(this.voiceStatusMessage, 3500);
          return;
        }

        if (event?.error === 'audio-capture') {
          this.voiceStatusMessage = this.t('voiceAssistantMicrophoneUnavailable');
          this.notificationService.warning(this.voiceStatusMessage, 3500);
          return;
        }

        if (event?.error === 'network') {
          if (this.tryRecoverVoiceRecognitionNetworkError()) {
            return;
          }

          this.voiceStatusMessage = this.t('voiceAssistantNetworkIssue');
          this.notificationService.warning(this.voiceStatusMessage, 3500);
          return;
        }

        this.voiceStatusMessage = this.t('voiceAssistantIdle');
      });
    };
    this.voiceRecognition.onnomatch = () => {
      this.runInUiContext(() => {
        this.voiceStatusMessage = this.t('voiceAssistantNoMatch');
      });
    };
    this.voiceRecognition.onresult = (event: any) => {
      const transcript = Array.from(event.results ?? [])
        .slice(event.resultIndex ?? 0)
        .map((result: any) => result?.[0]?.transcript ?? '')
        .join(' ')
        .trim();

      if (!transcript) {
        return;
      }

      this.pendingVoiceTranscript = transcript;
      this.voiceStatusMessage = this.t('voiceAssistantHeard', { command: transcript });

      const hasFinalResult = Array.from(event.results ?? [])
        .slice(event.resultIndex ?? 0)
        .some((result: any) => result?.isFinal);

      if (hasFinalResult) {
        this.finalizePendingVoiceCommand();
        return;
      }

      this.scheduleVoiceRecognitionFinalize();
    };
  }

  private getVoiceRecognitionLanguage(): string {
    const browserLanguage = this.document.defaultView?.navigator.language?.trim();
    if (browserLanguage) {
      return browserLanguage;
    }

    const languageMap: Record<LanguageId, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
    };

    return languageMap[this.language] ?? 'en-US';
  }

  private async handleVoiceCommand(commandText: string) {
    const transcript = commandText.trim();
    const normalized = this.normalizeVoiceText(transcript);
    if (!normalized) {
      return;
    }

    this.voiceLastCommand = transcript;
    this.voiceStatusMessage = this.t('voiceAssistantHeard', { command: transcript });

    const handled = this.user
      ? await this.handleWorkspaceVoiceCommand(transcript, normalized)
      : await this.handleAuthVoiceCommand(transcript, normalized);

    if (!handled) {
      this.respondToVoiceCommand(this.t('voiceAssistantUnknownCommand'), 'warning');
    }
  }

  private async handleAuthVoiceCommand(rawCommand: string, normalizedCommand: string): Promise<boolean> {
    if (normalizedCommand === 'help' || normalizedCommand === 'voice help') {
      this.respondToVoiceCommand(this.t('voiceAssistantLoginHint'));
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['open signup', 'show signup', 'switch to signup'])) {
      this.authMode = 'signup';
      this.respondToVoiceCommand(this.t('signupTab'));
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['open login', 'show login', 'switch to login'])) {
      this.authMode = 'login';
      this.respondToVoiceCommand(this.t('loginTab'));
      return true;
    }

    const username = this.extractVoiceValue(rawCommand, ['username ', 'set username ', 'my username is ']);
    if (username) {
      if (this.authMode === 'signup') {
        this.signupData.username = username;
      } else {
        this.loginData.username = username;
        this.onLoginUsernameChange();
      }
      this.respondToVoiceCommand(`${this.t('username')} set.`);
      return true;
    }

    const password = this.extractVoiceValue(rawCommand, ['password ', 'set password ', 'my password is ']);
    if (password) {
      if (this.authMode === 'signup') {
        this.signupData.password = password;
      } else {
        this.loginData.password = password;
      }
      this.respondToVoiceCommand(`${this.t('password')} set.`);
      return true;
    }

    const email = this.extractVoiceValue(rawCommand, ['email ', 'set email ', 'my email is ']);
    if (email && this.authMode === 'signup') {
      this.signupData.email = email;
      this.respondToVoiceCommand(`${this.t('email')} set.`);
      return true;
    }

    const fullName = this.extractVoiceValue(rawCommand, ['full name ', 'set full name ', 'my full name is ']);
    if (fullName && this.authMode === 'signup') {
      this.signupData.fullName = fullName;
      this.respondToVoiceCommand(`${this.t('fullName')} set.`);
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['login', 'sign in', 'submit login'])) {
      await this.login();
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['signup', 'sign up', 'create account'])) {
      this.authMode = 'signup';
      await this.signup();
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['login with fingerprint', 'use fingerprint'])) {
      await this.loginWithPasskey();
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['login with camera', 'use camera'])) {
      await this.loginWithCamera();
      return true;
    }

    return false;
  }

  private async handleWorkspaceVoiceCommand(rawCommand: string, normalizedCommand: string): Promise<boolean> {
    if (normalizedCommand === 'help' || normalizedCommand === 'voice help') {
      this.respondToVoiceCommand(this.t('voiceAssistantCommandHint'));
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['open profile', 'show profile'])) {
      this.profilePanelOpen = true;
      this.respondToVoiceCommand(this.t('profileSettings'));
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['close profile', 'hide profile'])) {
      this.closeProfilePanel();
      this.respondToVoiceCommand(this.t('close'));
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['logout', 'log out', 'sign out'])) {
      this.logout();
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['enable voice assistant'])) {
      this.setVoiceAssistantEnabled(true);
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['disable voice assistant'])) {
      this.setVoiceAssistantEnabled(false);
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['enable fingerprint', 'enable passkey'])) {
      if (!this.user?.hasPasskey) {
        await this.enrollPasskey();
      }
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['disable fingerprint', 'disable passkey'])) {
      if (this.user?.hasPasskey) {
        await this.disablePasskey();
      }
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['enable face login', 'enable camera login'])) {
      if (!this.user?.hasFaceLogin) {
        await this.openFaceEnrollment();
      }
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['disable face login', 'disable camera login'])) {
      if (this.user?.hasFaceLogin) {
        await this.disableFaceLogin();
      }
      return true;
    }

    if (this.matchesVoiceCommand(normalizedCommand, ['close camera', 'close dialog'])) {
      this.closeCameraPrompt();
      this.respondToVoiceCommand(this.t('close'));
      return true;
    }

    const requestedTheme = this.extractVoiceValue(rawCommand, ['change theme ', 'set theme ', 'theme ']);
    if (requestedTheme) {
      const theme = this.findThemeByVoice(requestedTheme);
      if (theme) {
        this.setTheme(theme.id);
        return true;
      }
    }

    const requestedLanguage = this.extractVoiceValue(rawCommand, ['change language ', 'set language ', 'language ']);
    if (requestedLanguage) {
      const language = this.findLanguageByVoice(requestedLanguage);
      if (language) {
        this.setLanguage(language.id);
        return true;
      }
    }

    const target = this.extractVoiceValue(rawCommand, ['open ', 'go to ']);
    if (target) {
      return this.openWorkspaceTarget(target);
    }

    if (await this.openWorkspaceTarget(rawCommand)) {
      return true;
    }

    return false;
  }

  private async openWorkspaceTarget(target: string): Promise<boolean> {
    const normalizedTarget = this.normalizeVoiceText(target);
    if (!normalizedTarget) {
      return false;
    }

    const module = this.modules.find((item) =>
      this.matchesVoiceCommand(normalizedTarget, [item.name, this.translateEntity(item.name)]),
    );
    if (module) {
      await this.selectModule(module);
      this.respondToVoiceCommand(this.translateEntity(module.name));
      return true;
    }

    const submenu = this.selectedModule?.subMenus?.find((item) =>
      this.matchesVoiceCommand(normalizedTarget, [item, this.translateEntity(item)]),
    );
    if (submenu) {
      this.openTab(submenu);
      this.respondToVoiceCommand(this.translateEntity(submenu));
      return true;
    }

    return false;
  }

  private findThemeByVoice(target: string): ThemeOption | undefined {
    const normalizedTarget = this.normalizeVoiceText(target);
    return this.themes.find((theme) =>
      this.normalizeVoiceText(theme.id) === normalizedTarget ||
      this.normalizeVoiceText(this.t(theme.labelKey)) === normalizedTarget,
    );
  }

  private findLanguageByVoice(target: string): LanguageOption | undefined {
    const normalizedTarget = this.normalizeVoiceText(target);
    return this.languages.find((language) =>
      this.normalizeVoiceText(language.id) === normalizedTarget ||
      this.normalizeVoiceText(language.label) === normalizedTarget,
    );
  }

  private respondToVoiceCommand(message: string, level: 'info' | 'success' | 'warning' = 'info') {
    this.voiceStatusMessage = message;

    if (level === 'success') {
      this.notificationService.success(message, 2500);
    } else if (level === 'warning') {
      this.notificationService.warning(message, 3000);
    } else {
      this.notificationService.info(message, 2500);
    }

    this.speakAssistant(message);
  }

  private speakAssistant(message: string) {
    const speechSynthesis = this.document.defaultView?.speechSynthesis;
    if (!speechSynthesis || !message.trim()) {
      return;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = this.getVoiceRecognitionLanguage();
    utterance.onstart = () => {
      this.runInUiContext(() => {
        this.voiceSpeaking = true;
      });
    };
    utterance.onend = () => {
      this.runInUiContext(() => {
        this.voiceSpeaking = false;
      });
    };
    utterance.onerror = () => {
      this.runInUiContext(() => {
        this.voiceSpeaking = false;
      });
    };
    speechSynthesis.speak(utterance);
  }

  private resetVoiceRecognitionTracking() {
    this.clearVoiceRecognitionSettleHandle();
    this.pendingVoiceTranscript = '';
    this.voiceCommandHandled = false;
  }

  private clearVoiceRecognitionSettleHandle() {
    if (this.voiceRecognitionSettleHandle) {
      clearTimeout(this.voiceRecognitionSettleHandle);
      this.voiceRecognitionSettleHandle = null;
    }
  }

  private clearVoiceRecognitionRetryHandle() {
    if (this.voiceRecognitionRetryHandle) {
      clearTimeout(this.voiceRecognitionRetryHandle);
      this.voiceRecognitionRetryHandle = null;
    }
  }

  private tryRecoverVoiceRecognitionNetworkError(): boolean {
    if (!this.voiceAssistantEnabled || !this.voiceAssistantSupported || this.voiceNetworkRetryCount >= 2) {
      return false;
    }

    this.voiceNetworkRetryCount += 1;
    this.clearVoiceRecognitionRetryHandle();
    this.voiceStatusMessage = this.t('voiceAssistantPreparing');
    this.voiceRecognitionRetryHandle = setTimeout(() => {
      this.runInUiContext(() => {
        if (!this.voiceAssistantEnabled || !this.voiceAssistantSupported) {
          return;
        }

        void this.beginVoiceRecognition();
      });
    }, 900);

    return true;
  }

  private scheduleVoiceRecognitionFinalize() {
    this.clearVoiceRecognitionSettleHandle();
    this.voiceRecognitionSettleHandle = setTimeout(() => {
      this.runInUiContext(() => {
        this.finalizePendingVoiceCommand();
      });
    }, 650);
  }

  private finalizePendingVoiceCommand() {
    this.clearVoiceRecognitionSettleHandle();
    const transcript = this.pendingVoiceTranscript.trim();
    if (!transcript || this.voiceCommandHandled) {
      return;
    }

    this.pendingVoiceTranscript = '';
    this.voiceCommandHandled = true;

    if (this.voiceRecognition) {
      try {
        this.voiceRecognition.stop();
      } catch {
        // Ignore stop errors from inactive recognizers.
      }
    }

    this.voiceListening = false;
    void this.handleVoiceCommand(transcript);
  }

  private async ensureMicrophonePermission(): Promise<boolean> {
    const mediaDevices = this.document.defaultView?.navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      this.voiceStatusMessage = this.t('voiceAssistantMicrophoneUnavailable');
      this.notificationService.warning(this.voiceStatusMessage, 3500);
      return false;
    }

    try {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      this.voiceStatusMessage = this.t('voiceAssistantPermissionDenied');
      this.notificationService.warning(this.voiceStatusMessage, 3500);
      return false;
    }
  }

  private describeVoiceStartError(error: unknown): string {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return this.t('voiceAssistantPermissionDenied');
    }

    if (error instanceof DOMException && error.name === 'InvalidStateError') {
      return this.t('voiceAssistantAlreadyListening');
    }

    return this.t('voiceAssistantIdle');
  }

  private extractVoiceValue(rawCommand: string, prefixes: string[]): string {
    const normalizedCommand = this.normalizeVoiceText(rawCommand);
    for (const prefix of prefixes) {
      const normalizedPrefix = this.normalizeVoiceText(prefix);
      if (normalizedCommand.startsWith(normalizedPrefix)) {
        return rawCommand.slice(prefix.length).trim();
      }

      const prefixIndex = normalizedCommand.indexOf(normalizedPrefix);
      if (prefixIndex >= 0) {
        const rawCommandLower = rawCommand.toLowerCase();
        const rawPrefixIndex = rawCommandLower.indexOf(prefix.trim().toLowerCase());
        if (rawPrefixIndex >= 0) {
          return rawCommand.slice(rawPrefixIndex + prefix.trim().length).trim();
        }
      }
    }

    return '';
  }

  private matchesVoiceCommand(normalizedCommand: string, commands: string[]): boolean {
    return commands.some((command) => {
      const normalizedCandidate = this.normalizeVoiceText(command);
      if (!normalizedCandidate) {
        return false;
      }

      return normalizedCommand === normalizedCandidate
        || normalizedCommand.startsWith(`${normalizedCandidate} `)
        || normalizedCommand.endsWith(` ${normalizedCandidate}`)
        || normalizedCommand.includes(` ${normalizedCandidate} `);
    });
  }

  private normalizeVoiceText(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\b(please|hey|hi|hello|assistant|can you|could you|would you|kindly)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private redirectToLocalhostForPasskeys(): boolean {
    const location = this.document.defaultView?.location;
    if (!location || location.hostname !== '127.0.0.1') {
      return false;
    }

    const redirectUrl = `${location.protocol}//localhost${location.port ? `:${location.port}` : ''}${location.pathname}${location.search}${location.hash}`;
    location.replace(redirectUrl);
    return true;
  }

  private ensurePlatformPasskeyAvailable(): boolean {
    if (this.platformPasskeyAvailable) {
      return true;
    }

    this.authError = this.t('passkeyBuiltInMissing');
    this.notificationService.warning(this.authError, 4000);
    return false;
  }

  t(key: TranslationKey, params?: Record<string, string | number>): string {
    return this.i18nService.t(key, params);
  }

  translateEntity(name: string): string {
    return this.i18nService.translateEntity(name);
  }

  private normalizeWorkspaceKey(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ');
  }

  getLanguageLabel(languageId: LanguageId): string {
    return this.i18nService.getLanguageLabel(languageId);
  }

  private loadLocalizedDisplayNames() {
    if (!this.user) {
      this.localizedDisplayNames = {};
      this.displayNameInput = '';
      return;
    }

    this.localizedDisplayNames = { ...(this.user.localizedDisplayNames ?? {}) };

    this.syncDisplayNameInput();
  }

  private syncDisplayNameInput() {
    this.displayNameInput = this.localizedDisplayNames[this.language] ?? '';
  }

  private async refreshLoginPasskeyAvailability(username: string) {
    const lookupVersion = ++this.loginPasskeyLookupVersion;

    try {
      const response = await this.apiRequest('/api/auth/passkey/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const result = await this.readApiBody<any>(response, 'passkey status response');

      if (lookupVersion !== this.loginPasskeyLookupVersion || this.loginData.username.trim() !== username) {
        return;
      }

      if (!response.ok) {
        throw new Error(this.translateApiError(result.error, this.t('fingerprintLoginFailed')));
      }

      this.runInUiContext(() => {
        this.loginPasskeyStatusKnown = true;
        this.loginPasskeyAvailable = Boolean(result.has_passkey ?? result.hasPasskey);
      });
    } catch {
      if (lookupVersion !== this.loginPasskeyLookupVersion || this.loginData.username.trim() !== username) {
        return;
      }

      this.runInUiContext(() => {
        this.loginPasskeyStatusKnown = false;
        this.loginPasskeyAvailable = false;
      });
    }
  }

  private async refreshLoginFaceAvailability(username: string) {
    const lookupVersion = ++this.loginFaceLookupVersion;

    try {
      const response = await this.apiRequest('/api/auth/face/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      const result = await this.readApiBody<any>(response, 'face status response');

      if (lookupVersion !== this.loginFaceLookupVersion || this.loginData.username.trim() !== username) {
        return;
      }

      if (!response.ok) {
        throw new Error(this.translateApiError(result.error, this.t('faceLoginFailed')));
      }

      this.runInUiContext(() => {
        this.loginFaceStatusKnown = true;
        this.loginFaceAvailable = Boolean(result.has_face_login ?? result.hasFaceLogin);
      });
    } catch {
      if (lookupVersion !== this.loginFaceLookupVersion || this.loginData.username.trim() !== username) {
        return;
      }

      this.runInUiContext(() => {
        this.loginFaceStatusKnown = false;
        this.loginFaceAvailable = false;
      });
    }
  }

  private syncLoginPasskeyAvailabilityFromUser() {
    const activeUsername = this.loginData.username.trim();
    if (!activeUsername || !this.user || this.user.username !== activeUsername) {
      return;
    }

    this.loginPasskeyStatusKnown = true;
    this.loginPasskeyAvailable = Boolean(this.user.hasPasskey);
  }

  private syncLoginFaceAvailabilityFromUser() {
    const activeUsername = this.loginData.username.trim();
    if (!activeUsername || !this.user || this.user.username !== activeUsername) {
      return;
    }

    this.loginFaceStatusKnown = true;
    this.loginFaceAvailable = Boolean(this.user.hasFaceLogin);
  }

  private async refreshCurrentUserPasskeyState() {
    if (!this.user?.username) {
      return;
    }

    try {
      const response = await this.apiRequest('/api/auth/passkey/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.user.username }),
      });
      const result = await this.readApiBody<any>(response, 'current user passkey status response');

      if (!response.ok) {
        throw new Error(this.translateApiError(result.error, this.t('fingerprintLoginFailed')));
      }

      this.runInUiContext(() => {
        if (!this.user) {
          return;
        }

        this.user = {
          ...this.user,
          hasPasskey: Boolean(result.has_passkey ?? result.hasPasskey),
        };
        localStorage.setItem('erpUser', JSON.stringify(this.user));
        this.syncLoginPasskeyAvailabilityFromUser();
      });
    } catch {
      // Keep the last known local state when the passkey status lookup is unavailable.
    }
  }

  private async refreshCurrentUserFaceState() {
    if (!this.user?.username) {
      return;
    }

    try {
      const response = await this.apiRequest('/api/auth/face/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.user.username }),
      });
      const result = await this.readApiBody<any>(response, 'current user face status response');

      if (!response.ok) {
        throw new Error(this.translateApiError(result.error, this.t('faceLoginFailed')));
      }

      this.runInUiContext(() => {
        if (!this.user) {
          return;
        }

        this.user = {
          ...this.user,
          faceImage: result.face_image ?? result.faceImage ?? this.user.faceImage ?? '',
          hasFaceLogin: Boolean(result.has_face_login ?? result.hasFaceLogin),
        };
        localStorage.setItem('erpUser', JSON.stringify(this.user));
        this.syncLoginFaceAvailabilityFromUser();
      });
    } catch {
      // Keep the last known local state when the face login status lookup is unavailable.
    }
  }

  private async detectPasskeyAvailability() {
    if (!this.passkeySupported) {
      this.platformPasskeyAvailable = false;
      return;
    }

    try {
      this.platformPasskeyAvailable = await platformAuthenticatorIsAvailable();
    } catch {
      this.platformPasskeyAvailable = false;
    }
  }

  private extractWebAuthnOptions(options: any) {
    return options?.publicKey ?? options;
  }

  async completeCameraAction() {
    if (!this.cameraMode || !this.cameraVideoRef?.nativeElement || !this.cameraReady) {
      this.cameraError = this.t('cameraStartFailed');
      this.notificationService.warning(this.cameraError, 3000);
      return;
    }

    this.faceBusy = true;
    this.cameraError = '';
    const startTime = Date.now();
    const capturedFrame = this.captureCurrentFrame(this.cameraVideoRef.nativeElement);

    try {
      const descriptor = await this.captureFaceDescriptor(capturedFrame);

      if (this.cameraMode === 'enroll-face') {
        await this.submitFaceEnrollment(descriptor, capturedFrame, startTime);
      } else {
        await this.submitFaceLogin(descriptor, startTime);
      }
    } catch (error) {
      const fallback = this.cameraMode === 'enroll-face' ? this.t('faceEnrollmentFailed') : this.t('faceLoginFailed');
      const message = this.describeAuthError(error, fallback);
      this.cameraError = message;
      this.authError = message;
      this.notificationService.error(message, 5000);
    } finally {
      this.faceBusy = false;
    }
  }

  closeCameraPrompt() {
    this.cameraPromptOpen = false;
    this.cameraMode = null;
    this.cameraError = '';
    this.cameraReady = false;
    this.stopCameraStream();
  }

  private async startCameraPrompt(mode: CameraMode) {
    if (!this.cameraSupported) {
      const message = this.t('cameraUnsupported');
      this.authError = message;
      this.notificationService.warning(message, 4000);
      return;
    }

    this.faceBusy = true;
    this.cameraError = '';
    this.cameraReady = false;

    try {
      await this.loadFaceApi();
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      this.cameraMode = mode;
      this.cameraPromptOpen = true;
      this.runInUiContext(() => {
        requestAnimationFrame(() => {
          void this.attachCameraStream(0);
          this.cameraCaptureDialogRef?.nativeElement.focus();
        });
      });
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'NotAllowedError'
        ? this.t('cameraPermissionDenied')
        : this.describeAuthError(error, this.t('cameraStartFailed'));
      this.authError = message;
      this.cameraError = message;
      this.notificationService.error(message, 5000);
      this.stopCameraStream();
    } finally {
      this.faceBusy = false;
    }
  }

  private async attachCameraStream(attempt: number) {
    const video = this.cameraVideoRef?.nativeElement;
    if (!this.cameraStream) {
      return;
    }

    if (!video) {
      if (attempt >= 20) {
        return;
      }

      window.setTimeout(() => {
        void this.attachCameraStream(attempt + 1);
      }, 50);
      return;
    }

    video.srcObject = this.cameraStream;
    try {
      if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });
      }

      await video.play();
      this.cameraReady = true;
      this.cameraError = '';
      this.startCameraPreview();
    } catch {
      // Browser autoplay policies may delay playback until the element is visible.
      this.cameraReady = false;
    }
  }

  private stopCameraStream() {
    this.stopCameraPreview();

    if (this.cameraVideoRef?.nativeElement) {
      this.cameraVideoRef.nativeElement.pause();
      this.cameraVideoRef.nativeElement.srcObject = null;
      this.cameraVideoRef.nativeElement.onloadedmetadata = null;
    }

    this.cameraStream?.getTracks().forEach(track => track.stop());
    this.cameraStream = null;
    this.cameraReady = false;
  }

  private startCameraPreview() {
    const video = this.cameraVideoRef?.nativeElement;
    const canvas = this.cameraPreviewCanvasRef?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!video || !canvas || !context) {
      return;
    }

    this.stopCameraPreview();

    const render = () => {
      if (!this.cameraPromptOpen || !this.cameraReady) {
        this.cameraPreviewFrameHandle = null;
        return;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      this.drawMirroredFrame(context, video, width, height);
      this.cameraPreviewFrameHandle = window.requestAnimationFrame(render);
    };

    render();
  }

  private stopCameraPreview() {
    if (this.cameraPreviewFrameHandle !== null) {
      window.cancelAnimationFrame(this.cameraPreviewFrameHandle);
      this.cameraPreviewFrameHandle = null;
    }

    const canvas = this.cameraPreviewCanvasRef?.nativeElement;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  private captureCurrentFrame(video: HTMLVideoElement): HTMLCanvasElement {
    const canvas = this.document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error(this.t('cameraStartFailed'));
    }

    this.drawMirroredFrame(context, video, width, height);
    return canvas;
  }

  private drawMirroredFrame(
    context: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    width: number,
    height: number,
  ) {
    context.save();
    context.clearRect(0, 0, width, height);
    context.translate(width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, width, height);
    context.restore();
  }

  private async captureFaceDescriptor(source: HTMLCanvasElement): Promise<number[]> {
    const faceapi = await this.loadFaceApi();
    const detectionPromise = faceapi
      .detectSingleFace(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error(this.t('cameraFaceNotDetected'))), 8000);
    });
    const detection = await Promise.race([detectionPromise, timeoutPromise]);

    if (!detection?.descriptor) {
      throw new Error(this.t('cameraFaceNotDetected'));
    }

    return Array.from(detection.descriptor as Float32Array);
  }

  private captureFacePhoto(frame: HTMLCanvasElement): string {
    const photoData = frame.toDataURL('image/jpeg', 0.92);
    if (!photoData) {
      throw new Error(this.t('cameraStartFailed'));
    }

    return photoData;
  }

  private async submitFaceEnrollment(descriptor: number[], frame: HTMLCanvasElement, startTime: number) {
    if (!this.user) {
      return;
    }

    const photoData = this.captureFacePhoto(frame);

    const response = await this.apiRequest('/api/auth/face/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: this.user.id,
        username: this.user.username,
        descriptor,
        photo_data: photoData,
      }),
    });
    const result = await this.readApiBody<any>(response, 'face enrollment response');
    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(this.translateApiError(result.error, this.t('faceEnrollmentFailed')));
    }

    this.persistAuthenticatedUser(result);
    this.closeCameraPrompt();
    this.notificationService.success(this.t('faceEnrollmentSuccessful', { duration }), 3000);
    await this.refreshCurrentUserFaceState();
  }

  private async submitFaceLogin(descriptor: number[], startTime: number) {
    const response = await this.apiRequest('/api/auth/face/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.loginData.username.trim(),
        descriptor,
      }),
    });
    const result = await this.readApiBody<any>(response, 'face login response');
    const duration = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(this.translateApiError(result.error, this.t('faceLoginFailed')));
    }

    this.persistAuthenticatedUser(result);
    this.closeCameraPrompt();
    this.notificationService.success(this.t('faceLoginSuccessful', { duration }), 3000);
  }

  private async loadFaceApi(): Promise<any> {
    if (window.faceapi?.nets?.tinyFaceDetector && window.faceapi?.nets?.faceRecognitionNet) {
      return window.faceapi;
    }

    if (!this.faceApiLoadPromise) {
      this.faceApiLoadPromise = this.loadFaceApiInternal();
    }

    return this.faceApiLoadPromise;
  }

  private async loadFaceApiInternal(): Promise<any> {
    await this.ensureScriptLoaded(FACE_API_SCRIPT_URL, 'erp-face-api');

    const faceapi = window.faceapi;
    if (!faceapi) {
      throw new Error(this.t('cameraModelsUnavailable'));
    }

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(FACE_API_MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(FACE_API_MODEL_URL),
    ]);

    return faceapi;
  }

  private ensureScriptLoaded(src: string, scriptId: string): Promise<void> {
    const existingScript = this.document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript?.dataset['loaded'] === 'true') {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error(this.t('cameraModelsUnavailable'))), { once: true });
        return;
      }

      const script = this.document.createElement('script');
      script.id = scriptId;
      script.src = src;
      script.async = true;
      script.onload = () => {
        script.dataset['loaded'] = 'true';
        resolve();
      };
      script.onerror = () => reject(new Error(this.t('cameraModelsUnavailable')));
      this.document.body.appendChild(script);
    });
  }

  private async readApiBody<T>(response: Response, label: string): Promise<T> {
    const bodyText = await response.text();

    if (!bodyText.trim()) {
      return {} as T;
    }

    try {
      return JSON.parse(bodyText) as T;
    } catch {
      if (!response.ok) {
        return { error: bodyText.trim() || `${label} failed with status ${response.status}` } as T;
      }

      throw new Error(`Expected JSON for ${label}, received: ${bodyText.trim()}`);
    }
  }

  private describeAuthError(error: unknown, fallback: string): string {
    if (typeof error === 'string' && error.trim()) {
      return this.i18nService.translateBackendError(error, fallback);
    }

    if (error instanceof WebAuthnError) {
      return this.i18nService.translateBackendError(error.message || '', fallback);
    }

    if (error instanceof Error) {
      return this.i18nService.translateBackendError(error.message || '', fallback);
    }

    return this.backendStatusMessage || fallback;
  }

  private translateApiError(message: string | undefined, fallback: string): string {
    return this.i18nService.translateBackendError(message ?? '', fallback);
  }

  private runInUiContext(work: () => void) {
    if (NgZone.isInAngularZone()) {
      work();
      return;
    }

    this.ngZone.run(work);
  }
}
