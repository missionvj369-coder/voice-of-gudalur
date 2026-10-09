import re

path = 'd:\\voice of gudalur\\src\\components\\Auth\\LoginResidentModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add AlertTriangle import
content = content.replace(
    'import { X, Phone, IdCard, LogIn, Loader2, ShieldCheck } from "lucide-react";',
    'import { X, Phone, IdCard, LogIn, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";'
)

# 2. Update the error message for NO_ACCOUNT
old_error = "toast.error('No account found with this Google. Please register first with your mobile number.', { duration: 6000 });"
new_error = (
    "toast.error(\n"
    "          'This Google account is not linked to any resident. ' +\n"
    "          'Please register with your mobile number first to get your Gudalur ID.',\n"
    "          { duration: 7000 }\n"
    "        );"
)
content = content.replace(old_error, new_error)

# 3. Change Telegram handler message
content = content.replace(
    "toast.info('Telegram sign-in requires server configuration (TELEGRAM_BOT_TOKEN). Please login with your phone number.');",
    "toast.info('Telegram sign-in requires server configuration. Please use phone registration.');"
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Done - file updated successfully')
