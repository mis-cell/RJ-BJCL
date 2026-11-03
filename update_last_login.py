import urllib.request
import urllib.error
import json
import os

# read env
env = {}
with open('.env') as f:
    for line in f:
        if '=' in line:
            k, v = line.strip().split('=', 1)
            env[k] = v

url = env.get('VITE_SUPABASE_URL', '') + '/rest/v1/rpc/exec_sql'
key = env.get('VITE_SUPABASE_ANON_KEY', '')

req = urllib.request.Request(url, method='POST')
req.add_header('Content-Type', 'application/json')
req.add_header('apikey', key)
req.add_header('Authorization', 'Bearer ' + key)

data = json.dumps({"query": "ALTER TABLE user_master ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;"}).encode('utf-8')

try:
    urllib.request.urlopen(req, data=data)
    print("Schema patched.")
except urllib.error.URLError as e:
    print("Error:", e.read())

data2 = json.dumps({"query": "UPDATE user_master SET last_login = NOW() WHERE user_id = '001';"}).encode('utf-8')
try:
    urllib.request.urlopen(req, data=data2)
    print("Data updated.")
except urllib.error.URLError as e:
    print("Error:", e.read())

