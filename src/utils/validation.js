export const nameErrorMessage = 'Name can only contain letters, spaces, hyphens and apostrophes'
export const emailHelperText = 'Enter a valid email address'
export const emailErrorMessage = 'Please enter a valid email address'

const nameCharactersPattern = /^[\p{L}\s'-]*$/u
const validNamePattern = /^[\p{L}]+(?:[\s'-][\p{L}]+)*$/u
const validEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function sanitizeName(value) {
  return value.replace(/[^\p{L}\s'-]/gu, '')
}

export function hasOnlyValidNameCharacters(value) {
  return nameCharactersPattern.test(value)
}

export function isValidName(value) {
  return validNamePattern.test(value.trim())
}

export function normalizeEmail(value) {
  return value.trim()
}

export function isValidEmail(value) {
  return validEmailPattern.test(normalizeEmail(value))
}