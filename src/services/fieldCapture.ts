export type FieldCapability = {
    nfc: 'available' | 'unsupported';
    geolocation: 'available' | 'unsupported';
    secureContext: boolean;
};

export type CurrentPosition = {
    latitude: number;
    longitude: number;
    accuracy?: number;
};

export type NfcCaptureStatus = 'unsupported' | 'blocked_missing_credentials' | 'manual_entry_required';

type BrowserWindow = Window & typeof globalThis & {
    NDEFReader?: unknown;
};

export const detectFieldCapabilities = (): FieldCapability => {
    const hasWindow = typeof window !== 'undefined';
    const browserWindow = hasWindow ? (window as BrowserWindow) : undefined;
    const hasNavigator = typeof navigator !== 'undefined';

    return {
        secureContext: Boolean(browserWindow?.isSecureContext),
        nfc: browserWindow && 'NDEFReader' in browserWindow ? 'available' : 'unsupported',
        geolocation: hasNavigator && 'geolocation' in navigator ? 'available' : 'unsupported',
    };
};

export const requestCurrentPosition = (): Promise<CurrentPosition> => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        return Promise.reject(new Error('Geolocalização indisponível neste navegador.'));
    }

    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                reject(new Error(error.message || 'Não foi possível obter a localização atual.'));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        );
    });
};

export const getNfcCaptureStatus = (): NfcCaptureStatus => {
    const capabilities = detectFieldCapabilities();
    if (capabilities.nfc === 'unsupported') return 'unsupported';
    return 'blocked_missing_credentials';
};
