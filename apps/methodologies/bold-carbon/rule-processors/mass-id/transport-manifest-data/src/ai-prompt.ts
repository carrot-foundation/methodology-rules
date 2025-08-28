export const AI_ADDITIONAL_CONTEXT = `You are analyzing a document that should be a waste transport manifest. Look for these core indicators:

DOCUMENT PURPOSE:
- "Manifest" or "Manifesto" in title with transport/transportation references
- Transport documentation numbering (MTR numbers, manifest IDs)
- Movement or logistics-focused language rather than treatment confirmation
- Transit authorization or shipping documentation format

ENTITY RELATIONSHIPS:
- Three distinct entities: waste generator, transporter, and receiver/destination
- Transportation company identification with vehicle details
- Driver information and transportation credentials
- Logistics chain documentation (pickup, transport, delivery)

TRANSPORT LOGISTICS DATA:
- Vehicle identification (license plates, truck numbers)
- Transport dates and scheduling information
- Driver names and identification
- Route or transportation method details
- Packaging and transport safety certifications

WASTE MOVEMENT TRACKING:
- Waste quantities being transported (not processed)
- Waste classification codes for transport purposes
- Packaging and containment specifications for transit
- Loading and transport safety compliance statements

REGULATORY FRAMEWORK:
- Transport permits and environmental agency oversight
- Movement authorization numbers
- Transit safety regulations compliance
- Chain of custody for transportation phase

DISTINCTIVE LANGUAGE:
- References to "transport," "movement," "shipment," or "transit"
- Focus on logistics rather than treatment or disposal
- Transportation safety and packaging requirements`;
