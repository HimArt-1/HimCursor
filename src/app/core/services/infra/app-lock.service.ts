import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppLockService {
    readonly isLocked = signal(false);
    readonly isBiometricEnabled = signal(localStorage.getItem('washa_biometric_enabled') === 'true');
    private readonly CREDENTIAL_ID_KEY = 'washa_biometric_cred_id';

    constructor() {
        // Auto-lock on start if biometric is enabled
        if (this.isBiometricEnabled()) {
            this.isLocked.set(true);
            this.promptBiometricUnlock();
        }
    }

    lock() {
        this.isLocked.set(true);
    }

    async setupBiometric(): Promise<boolean> {
        if (!window.PublicKeyCredential) {
            alert('متصفحك لا يدعم البصمة أو التعرف على الوجه');
            return false;
        }

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            const userId = new Uint8Array(16);
            window.crypto.getRandomValues(userId);

            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge,
                    rp: {
                        name: 'Washa Control POS',
                    },
                    user: {
                        id: userId,
                        name: 'cashier@washa.com',
                        displayName: 'كاشير وشّى',
                    },
                    pubKeyCredParams: [
                        { type: 'public-key', alg: -7 }, // ES256
                        { type: 'public-key', alg: -257 } // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required'
                    },
                    timeout: 60000,
                    attestation: 'none'
                }
            });

            if (credential) {
                // Save credential ID
                const rawId = new Uint8Array((credential as any).rawId);
                const base64Id = btoa(String.fromCharCode.apply(null, Array.from(rawId)));
                localStorage.setItem(this.CREDENTIAL_ID_KEY, base64Id);
                localStorage.setItem('washa_biometric_enabled', 'true');
                this.isBiometricEnabled.set(true);
                return true;
            }
        } catch (error) {
            console.error('Biometric setup failed:', error);
        }
        return false;
    }

    async promptBiometricUnlock(): Promise<boolean> {
        if (!window.PublicKeyCredential) return false;
        
        const credIdStr = localStorage.getItem(this.CREDENTIAL_ID_KEY);
        if (!credIdStr) return false;

        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);
            
            const rawId = Uint8Array.from(atob(credIdStr), c => c.charCodeAt(0));

            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge,
                    allowCredentials: [{
                        id: rawId,
                        type: 'public-key'
                    }],
                    userVerification: 'required',
                    timeout: 60000
                }
            });

            if (assertion) {
                this.isLocked.set(false);
                return true;
            }
        } catch (error) {
            console.error('Biometric unlock failed:', error);
        }
        return false;
    }

    disableBiometric() {
        localStorage.removeItem(this.CREDENTIAL_ID_KEY);
        localStorage.setItem('washa_biometric_enabled', 'false');
        this.isBiometricEnabled.set(false);
        this.isLocked.set(false);
    }
}
