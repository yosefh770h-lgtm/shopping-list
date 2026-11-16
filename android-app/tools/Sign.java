// חתימת ה-APK (חתימה מסוג v2, מתאימה לאנדרואיד 7 ומעלה) עם המפתח הקבוע של האפליקציה
import com.android.apksig.ApkSigner;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

public class Sign {
    public static void main(String[] a) throws Exception {
        if (a.length != 4) {
            System.err.println("usage: Sign <keystore> <alias> <in.apk> <out.apk>   (password in env KEYSTORE_PASSWORD)");
            System.exit(2);
        }
        String pass = System.getenv("KEYSTORE_PASSWORD");
        if (pass == null || pass.isEmpty()) throw new IllegalStateException("KEYSTORE_PASSWORD is not set");
        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream in = new FileInputStream(a[0])) { ks.load(in, pass.toCharArray()); }
        PrivateKey key = (PrivateKey) ks.getKey(a[1], pass.toCharArray());
        X509Certificate cert = (X509Certificate) ks.getCertificate(a[1]);
        ApkSigner.SignerConfig signer = new ApkSigner.SignerConfig.Builder("YAMSHOP", key, Collections.singletonList(cert)).build();
        new ApkSigner.Builder(Collections.singletonList(signer))
                .setInputApk(new File(a[2]))
                .setOutputApk(new File(a[3]))
                .setMinSdkVersion(24)
                .setV1SigningEnabled(false)
                .setV2SigningEnabled(true)
                .build()
                .sign();
    }
}
