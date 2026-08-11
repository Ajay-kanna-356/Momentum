import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { authenticateWithOAuth } from "../services/auth.service.js";

const GOOGLE_SCOPES = ["profile", "email"];

function configureGoogleStrategy() {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL,
                scope: GOOGLE_SCOPES,
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const user = await authenticateWithOAuth("google", profile.id, {
                        name: profile.displayName || "Momentum User",
                        email: profile.emails?.[0]?.value,
                        profilePicture: profile.photos?.[0]?.value ?? null,
                    });

                    done(null, user);
                } catch (error) {
                    done(error);
                }
            }
        )
    );
}

export function initializePassport() {
    configureGoogleStrategy();
}

export { GOOGLE_SCOPES };
