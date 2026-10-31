import hashlib
import json
import plistlib
import struct
import sys
from pathlib import Path
from zipfile import ZipFile

ipa = Path(sys.argv[1])
digest = hashlib.sha256(ipa.read_bytes()).hexdigest()
if len(sys.argv) > 2:
    assert digest == sys.argv[2], 'SHA-256 diverge do checksum do runner'

with ZipFile(ipa) as archive:
    assert archive.testzip() is None, 'CRC inválido no IPA'
    names = set(archive.namelist())
    roots = [name.rsplit('/', 1)[0] + '/' for name in names if name.startswith('Payload/') and name.endswith('.app/Info.plist') and name.count('/') == 2]
    assert len(roots) == 1, 'Esperado um único aplicativo no Payload'
    root = roots[0]
    info = plistlib.loads(archive.read(root + 'Info.plist'))
    executable_name = root + info['CFBundleExecutable']
    executable = archive.read(executable_name)
    assert executable[:4] == b'\xcf\xfa\xed\xfe', 'Esperado executável Mach-O 64-bit little-endian'
    _, cpu_type, _, _, count, _, _, _ = struct.unpack_from('<IiiIIIII', executable)
    assert cpu_type == 0x0100000C, 'Executável não é arm64'
    commands_offset = 32
    platform = None
    signature_size = 0
    for _ in range(count):
        command, size = struct.unpack_from('<II', executable, commands_offset)
        assert size >= 8 and commands_offset + size <= len(executable)
        if command == 0x32:
            platform = struct.unpack_from('<I', executable, commands_offset + 8)[0]
        elif command == 0x1D:
            signature_size = struct.unpack_from('<I', executable, commands_offset + 12)[0]
        commands_offset += size
    assert platform == 2, 'Build não é para aparelho iOS'
    assert archive.getinfo(executable_name).external_attr >> 16 & 0o111, 'Permissão de execução ausente'
    bundle = archive.read(root + 'main.jsbundle')
    assert len(bundle) > 0, 'Bundle JavaScript ausente'
    assert not any(name.startswith(root + '_CodeSignature/') for name in names), 'Assinatura de recursos encontrada'
    assert root + 'embedded.mobileprovision' not in names, 'Perfil de provisionamento encontrado'
    assert signature_size == 0, 'Executável contém assinatura embutida'
    print(json.dumps({
        'file': str(ipa),
        'bytes': ipa.stat().st_size,
        'sha256': digest,
        'bundle_id': info['CFBundleIdentifier'],
        'version': info['CFBundleShortVersionString'],
        'build': info['CFBundleVersion'],
        'minimum_ios': info.get('MinimumOSVersion'),
        'supported_platforms': info.get('CFBundleSupportedPlatforms'),
        'architecture': 'arm64',
        'platform': 'iOS device',
        'unsigned': True,
        'js_bundle_bytes': len(bundle),
        'zip_entries': len(names),
        'zip_crc': 'OK',
    }, indent=2))
