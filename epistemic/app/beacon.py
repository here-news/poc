"""
Beacon Client for Gateway Registration

This module handles automatic registration and heartbeat with the gateway service.
Apps using this beacon will automatically appear in the /switcher when active.
"""

import httpx
import asyncio
import json
from pathlib import Path
from typing import Optional


class BeaconClient:
    """Client for registering apps with the gateway and sending heartbeats"""

    def __init__(self, gateway_url: str = "http://gateway:3000"):
        """
        Initialize beacon client

        Args:
            gateway_url: URL of the gateway service (default: http://gateway:3000)
        """
        self.gateway_url = gateway_url
        self.app_metadata = self.load_metadata()
        self.running = False
        self._heartbeat_task: Optional[asyncio.Task] = None

    def load_metadata(self) -> dict:
        """Load app.json metadata from project root"""
        # Look for app.json in parent directory
        app_json_path = Path(__file__).parent.parent / "app.json"

        if not app_json_path.exists():
            raise FileNotFoundError(
                f"app.json not found at {app_json_path}. "
                "Please create an app.json file in your project root."
            )

        with open(app_json_path) as f:
            return json.load(f)

    async def register(self) -> bool:
        """
        Register app with gateway

        Returns:
            bool: True if registration successful, False otherwise
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.gateway_url}/api/apps/register",
                    json=self.app_metadata,
                    timeout=5.0
                )
                response.raise_for_status()
                result = response.json()
                print(f"✓ Registered with gateway: {result}")
                return True
            except httpx.RequestError as e:
                print(f"✗ Failed to register with gateway: {e}")
                print(f"  Gateway URL: {self.gateway_url}")
                print(f"  Make sure the gateway service is running")
                return False
            except Exception as e:
                print(f"✗ Unexpected error during registration: {e}")
                return False

    async def send_heartbeat(self) -> bool:
        """
        Send a single heartbeat to the gateway

        Returns:
            bool: True if heartbeat successful, False otherwise
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.gateway_url}/api/apps/heartbeat",
                    json={"id": self.app_metadata["id"]},
                    timeout=5.0
                )
                response.raise_for_status()
                return True
            except Exception as e:
                print(f"✗ Heartbeat failed: {e}")
                return False

    async def heartbeat_loop(self):
        """Send periodic heartbeats every 30 seconds"""
        self.running = True
        heartbeat_count = 0

        while self.running:
            await asyncio.sleep(30)  # Wait 30 seconds between heartbeats

            if not self.running:
                break

            success = await self.send_heartbeat()
            heartbeat_count += 1

            if success:
                print(f"♥ Heartbeat #{heartbeat_count} sent successfully")
            else:
                print(f"⚠ Heartbeat #{heartbeat_count} failed - will retry in 30s")

    async def start(self):
        """
        Start the beacon service

        This will:
        1. Register the app with the gateway
        2. Start sending periodic heartbeats
        """
        print(f"🚀 Starting beacon for {self.app_metadata['name']}")
        print(f"   ID: {self.app_metadata['id']}")
        print(f"   Version: {self.app_metadata['version']}")
        print(f"   Status: {self.app_metadata['status']}")

        # Register with gateway
        success = await self.register()

        if not success:
            print("⚠ Failed to register - will continue anyway and retry heartbeats")

        # Start heartbeat loop
        self._heartbeat_task = asyncio.create_task(self.heartbeat_loop())
        print("✓ Beacon started - sending heartbeats every 30s")

    def stop(self):
        """Stop the beacon service"""
        print("🛑 Stopping beacon service...")
        self.running = False

        if self._heartbeat_task:
            self._heartbeat_task.cancel()

        print("✓ Beacon stopped")
