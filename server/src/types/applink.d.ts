// The @heroku/applink type declaration for Org is missing accessToken,
// which OrgImpl does expose at runtime (set in its constructor).
// This augmentation adds only the missing property.
import "@heroku/applink";

declare module "@heroku/applink" {
  interface Org {
    readonly accessToken: string;
  }
}
