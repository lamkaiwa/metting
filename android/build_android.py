"""Build and verify a signed APK. Signing material stays in .private, never in arguments."""
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import hashlib

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
java = Path(os.environ.get('JAVA_HOME', Path.home()/'.jdks/ms-17.0.15'))
sdk = Path(os.environ.get('ANDROID_HOME', Path.home()/'AppData/Local/Android/Sdk'))
suffix = '.exe' if os.name == 'nt' else ''
if not (java/'bin'/('java'+suffix)).is_file():
    raise SystemExit('Set JAVA_HOME to a JDK 17 installation.')
if not (sdk/'platforms/android-36/android.jar').is_file():
    raise SystemExit('Install Android SDK platform 36 and set ANDROID_HOME.')
private = ROOT/'.private'
private.mkdir(exist_ok=True)
secret_file = private/'signing.json'
if not secret_file.exists():
    secret_file.write_text(json.dumps({'storePassword': secrets.token_urlsafe(32)}), encoding='utf-8')
secret = json.loads(secret_file.read_text(encoding='utf-8'))['storePassword']
env = {**os.environ, 'JAVA_HOME':str(java), 'TONGPIN_STORE_PASSWORD':secret}
key = private/'tongpin-release.jks'
if not key.exists():
    subprocess.run([str(java/'bin'/('keytool'+suffix)), '-genkeypair', '-keystore', str(key),
        '-storepass:env','TONGPIN_STORE_PASSWORD','-keypass:env','TONGPIN_STORE_PASSWORD',
        '-alias','tongpin','-keyalg','RSA','-keysize','3072','-validity','10000',
        '-dname','CN=Tongpin, O=Tongpin, C=HK','-storetype','PKCS12'], env=env, check=True)
(ROOT/'local.properties').write_text('sdk.dir='+sdk.as_posix()+'\n', encoding='utf-8')
wrapper = str(ROOT/('gradlew.bat' if os.name=='nt' else 'gradlew'))
subprocess.run([wrapper, ':app:assembleRelease', '--console','plain','--no-daemon'], env=env, check=True)
apk = ROOT/'app/build/outputs/apk/release/app-release.apk'
subprocess.run([str(sdk/'build-tools/35.0.0'/('apksigner.bat' if os.name=='nt' else 'apksigner')),
               'verify','--verbose',str(apk)],env=env,check=True)
output = ROOT/'output'
output.mkdir(exist_ok=True)
destination = output/'tongpin-1.0.0.apk'
shutil.copy2(apk,destination)
digest = hashlib.sha256(destination.read_bytes()).hexdigest()
(output/'SHA256SUMS.txt').write_text(digest+'  '+destination.name+'\n',encoding='utf-8')
print('Signed APK: '+str(destination))
